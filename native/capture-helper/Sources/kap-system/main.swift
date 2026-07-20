import AppKit
import CoreAudio
import Foundation
import Quartz

struct AudioDevice: Codable {
  let uid: String
  let name: String
  let transportType: String
}

struct Window: Codable {
  let pid: Int
  let ownerName: String
  let name: String
  let width: Int
  let height: Int
  let x: Int
  let y: Int
  let number: Int
}

struct OpenWithApp: Codable {
  let url: String
  let isDefault: Bool
  let icon: String
}

enum HelperError: Error, CustomStringConvertible {
  case invalidArguments
  case operationFailed(String)

  var description: String {
    switch self {
    case .invalidArguments:
      return "Invalid arguments"
    case .operationFailed(let message):
      return message
    }
  }
}

func propertyDataSize(
  objectID: AudioObjectID = AudioObjectID(kAudioObjectSystemObject),
  selector: AudioObjectPropertySelector,
  scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal
) throws -> UInt32 {
  var address = AudioObjectPropertyAddress(
    mSelector: selector,
    mScope: scope,
    mElement: kAudioObjectPropertyElementMain
  )
  var size: UInt32 = 0
  let status = AudioObjectGetPropertyDataSize(objectID, &address, 0, nil, &size)
  guard status == noErr else {
    throw HelperError.operationFailed("CoreAudio property size failed: \(status)")
  }

  return size
}

func propertyValue<T>(
  objectID: AudioObjectID = AudioObjectID(kAudioObjectSystemObject),
  selector: AudioObjectPropertySelector,
  scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal,
  value: inout T
) throws {
  var address = AudioObjectPropertyAddress(
    mSelector: selector,
    mScope: scope,
    mElement: kAudioObjectPropertyElementMain
  )
  var size = UInt32(MemoryLayout<T>.size)
  let status = AudioObjectGetPropertyData(objectID, &address, 0, nil, &size, &value)
  guard status == noErr else {
    throw HelperError.operationFailed("CoreAudio property read failed: \(status)")
  }
}

func audioDevice(_ id: AudioDeviceID) throws -> AudioDevice {
  var name = "" as CFString
  try propertyValue(objectID: id, selector: kAudioObjectPropertyName, value: &name)

  var uid = "" as CFString
  try propertyValue(objectID: id, selector: kAudioDevicePropertyDeviceUID, value: &uid)

  var transport: UInt32 = 0
  try? propertyValue(objectID: id, selector: kAudioDevicePropertyTransportType, value: &transport)

  let transportTypes: [UInt32: String] = [
    kAudioDeviceTransportTypeAVB: "avb",
    kAudioDeviceTransportTypeAggregate: "aggregate",
    kAudioDeviceTransportTypeAirPlay: "airplay",
    kAudioDeviceTransportTypeAutoAggregate: "autoaggregate",
    kAudioDeviceTransportTypeBluetooth: "bluetooth",
    kAudioDeviceTransportTypeBluetoothLE: "bluetoothle",
    kAudioDeviceTransportTypeBuiltIn: "builtin",
    kAudioDeviceTransportTypeDisplayPort: "displayport",
    kAudioDeviceTransportTypeFireWire: "firewire",
    kAudioDeviceTransportTypeHDMI: "hdmi",
    kAudioDeviceTransportTypePCI: "pci",
    kAudioDeviceTransportTypeThunderbolt: "thunderbolt",
    kAudioDeviceTransportTypeUSB: "usb",
    kAudioDeviceTransportTypeVirtual: "virtual"
  ]

  return AudioDevice(
    uid: uid as String,
    name: name as String,
    transportType: transportTypes[transport] ?? "unknown"
  )
}

func inputAudioDevices() throws -> [AudioDevice] {
  let size = try propertyDataSize(selector: kAudioHardwarePropertyDevices)
  let count = Int(size) / MemoryLayout<AudioDeviceID>.size
  var ids = [AudioDeviceID](repeating: 0, count: count)
  var address = AudioObjectPropertyAddress(
    mSelector: kAudioHardwarePropertyDevices,
    mScope: kAudioObjectPropertyScopeGlobal,
    mElement: kAudioObjectPropertyElementMain
  )
  var mutableSize = size
  let status = AudioObjectGetPropertyData(
    AudioObjectID(kAudioObjectSystemObject),
    &address,
    0,
    nil,
    &mutableSize,
    &ids
  )
  guard status == noErr else {
    throw HelperError.operationFailed("CoreAudio device list failed: \(status)")
  }

  return ids.compactMap { id in
    guard (try? propertyDataSize(
      objectID: id,
      selector: kAudioDevicePropertyStreams,
      scope: kAudioDevicePropertyScopeInput
    )) ?? 0 > 0 else {
      return nil
    }

    return try? audioDevice(id)
  }
}

func defaultInputAudioDevice() throws -> AudioDevice {
  var id: AudioDeviceID = 0
  try propertyValue(selector: kAudioHardwarePropertyDefaultInputDevice, value: &id)
  return try audioDevice(id)
}

func windows() -> [Window] {
  let options: CGWindowListOption = [.excludeDesktopElements, .optionOnScreenOnly]
  let list = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] ?? []

  return list.compactMap { item in
    guard
      (item[kCGWindowAlpha as String] as? NSNumber)?.doubleValue != 0,
      let bounds = item[kCGWindowBounds as String] as? [String: Any],
      let width = (bounds["Width"] as? NSNumber)?.intValue,
      let height = (bounds["Height"] as? NSNumber)?.intValue,
      width >= 50,
      height >= 50,
      let pid = (item[kCGWindowOwnerPID as String] as? NSNumber)?.intValue
    else {
      return nil
    }

    return Window(
      pid: pid,
      ownerName: item[kCGWindowOwnerName as String] as? String ?? "",
      name: item[kCGWindowName as String] as? String ?? "",
      width: width,
      height: height,
      x: (bounds["X"] as? NSNumber)?.intValue ?? 0,
      y: (bounds["Y"] as? NSNumber)?.intValue ?? 0,
      number: (item[kCGWindowNumber as String] as? NSNumber)?.intValue ?? 0
    )
  }
}

func activateApplication(named name: String) -> Bool {
  guard let application = NSWorkspace.shared.runningApplications.first(where: {
    $0.localizedName == name
  }) else {
    return false
  }

  return application.activate(options: .activateAllWindows)
}

func resizedPngDataUrl(for applicationUrl: URL) -> String {
  let source = NSWorkspace.shared.icon(forFile: applicationUrl.path)
  let target = NSImage(size: NSSize(width: 64, height: 64))
  target.lockFocus()
  source.draw(
    in: NSRect(x: 0, y: 0, width: 64, height: 64),
    from: .zero,
    operation: .copy,
    fraction: 1
  )
  target.unlockFocus()

  guard
    let tiff = target.tiffRepresentation,
    let bitmap = NSBitmapImageRep(data: tiff),
    let png = bitmap.representation(using: .png, properties: [:])
  else {
    return ""
  }

  return "data:image/png;base64,\(png.base64EncodedString())"
}

func applicationsThatOpen(extension fileExtension: String) -> [OpenWithApp] {
  let temporaryUrl = FileManager.default.temporaryDirectory
    .appendingPathComponent(UUID().uuidString)
    .appendingPathExtension(fileExtension)
  FileManager.default.createFile(atPath: temporaryUrl.path, contents: Data())
  defer { try? FileManager.default.removeItem(at: temporaryUrl) }

  let roles: LSRolesMask = [.viewer, .editor]
  let applicationUrls = LSCopyApplicationURLsForURL(temporaryUrl as CFURL, roles)?
    .takeRetainedValue() as? [URL] ?? []
  let defaultUrl = LSCopyDefaultApplicationURLForURL(temporaryUrl as CFURL, roles, nil)?
    .takeRetainedValue() as URL?

  return applicationUrls.map { url in
    OpenWithApp(
      url: url.absoluteString,
      isDefault: url == defaultUrl,
      icon: resizedPngDataUrl(for: url)
    )
  }
}

func open(_ filePath: String, with applicationUrl: URL) throws {
  try NSWorkspace.shared.open(
    [URL(fileURLWithPath: filePath)],
    withApplicationAt: applicationUrl,
    configuration: [:]
  )
}

func printJson<T: Encodable>(_ value: T) throws {
  let data = try JSONEncoder().encode(value)
  guard let json = String(data: data, encoding: .utf8) else {
    throw HelperError.operationFailed("Could not encode JSON")
  }

  print(json)
}

do {
  let arguments = Array(CommandLine.arguments.dropFirst())
  guard let command = arguments.first else {
    throw HelperError.invalidArguments
  }

  switch command {
  case "audio-inputs":
    try printJson(inputAudioDevices())
  case "audio-default-input":
    try printJson(defaultInputAudioDevice())
  case "windows":
    try printJson(windows())
  case "activate":
    guard arguments.count == 2, activateApplication(named: arguments[1]) else {
      throw HelperError.operationFailed("Could not activate application")
    }
  case "open-with-apps":
    guard arguments.count == 2 else {
      throw HelperError.invalidArguments
    }

    try printJson(applicationsThatOpen(extension: arguments[1]))
  case "open-with":
    guard arguments.count == 3, let applicationUrl = URL(string: arguments[2]) else {
      throw HelperError.invalidArguments
    }

    try open(arguments[1], with: applicationUrl)
  default:
    throw HelperError.invalidArguments
  }
} catch {
  FileHandle.standardError.write(Data("\(error)\n".utf8))
  exit(1)
}
