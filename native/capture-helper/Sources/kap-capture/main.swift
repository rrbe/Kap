import Aperture
import AVFoundation
import Darwin
import Foundation

private struct CropArea: Decodable {
  let x: Double
  let y: Double
  let width: Double
  let height: Double

  var rectangle: CGRect {
    CGRect(x: x, y: y, width: width, height: height)
  }
}

private struct CaptureOptions: Decodable {
  let destination: String
  let fps: Int
  let cropArea: CropArea?
  let showCursor: Bool
  let highlightClicks: Bool
  let screenId: Int
  let audioDeviceId: String?
  let recordSystemAudio: Bool
  let videoCodec: String?

  func recordingOptions(destination: URL) throws -> Aperture.RecordingOptions {
    Aperture.RecordingOptions(
      destination: destination,
      targetID: String(screenId),
      framesPerSecond: fps,
      cropRect: cropArea?.rectangle,
      showCursor: showCursor,
      highlightClicks: highlightClicks,
      videoCodec: try apertureVideoCodec,
      recordSystemAudio: recordSystemAudio,
      microphoneDeviceID: audioDeviceId
    )
  }

  private var apertureVideoCodec: Aperture.VideoCodec {
    get throws {
      switch videoCodec ?? "h264" {
      case "h264":
        return .h264
      case "hevc":
        return .hevc
      case "proRes422":
        return .proRes422
      case "proRes4444":
        return .proRes4444
      default:
        throw Aperture.Error.unsupportedVideoCodec
      }
    }
  }
}

private struct Message: Encodable {
  let event: String
  let value: Bool?
  let message: String?

  init(event: String, value: Bool? = nil, message: String? = nil) {
    self.event = event
    self.value = value
    self.message = message
  }
}

private enum Output {
  private static let encoder = JSONEncoder()
  private static let lock = NSLock()

  static func send(_ message: Message) {
    lock.lock()
    defer { lock.unlock() }

    guard
      let data = try? encoder.encode(message),
      let line = String(data: data, encoding: .utf8)
    else {
      return
    }

    print(line)
    fflush(stdout)
  }
}

private func errorMessage(_ error: Error) -> String {
  if let error = error as? Aperture.Error {
    if case let .couldNotStartStream(underlyingError?) = error {
      let error = underlyingError as NSError
      return "\(error.localizedDescription) (\(error.domain) \(error.code))"
    }

    return error.localizedDescription
  }

  return error.localizedDescription
}

private final class CaptureSession {
  private let options: CaptureOptions
  private let destination: URL
  private let segmentDirectory: URL
  private var segmentURLs: [URL] = []
  private var recorder: Aperture.Recorder?

  var isPaused: Bool {
    recorder == nil
  }

  init(options: CaptureOptions) {
    self.options = options
    destination = URL(fileURLWithPath: options.destination)
    segmentDirectory = destination
      .deletingLastPathComponent()
      .appendingPathComponent(".kap-capture-\(UUID().uuidString)", isDirectory: true)
  }

  func start() async throws {
    try FileManager.default.createDirectory(at: segmentDirectory, withIntermediateDirectories: true)
    do {
      try await startSegment()
    } catch {
      try? FileManager.default.removeItem(at: segmentDirectory)
      throw error
    }
  }

  func pause() async throws {
    guard let recorder else {
      throw Aperture.Error.recorderNotStarted
    }

    try await recorder.stop()
    self.recorder = nil
  }

  func resume() async throws {
    guard recorder == nil else {
      throw Aperture.Error.recorderAlreadyStarted
    }

    try await startSegment()
  }

  func stop() async throws {
    if let recorder {
      try await recorder.stop()
      self.recorder = nil
    }

    do {
      if segmentURLs.count == 1, let segmentURL = segmentURLs.first {
        try FileManager.default.moveItem(at: segmentURL, to: destination)
      } else {
        try await mergeSegments()
      }

      try FileManager.default.removeItem(at: segmentDirectory)
    } catch {
      try? FileManager.default.removeItem(at: destination)
      throw error
    }
  }

  func cancel() async {
    if let recorder {
      try? await recorder.stop()
      self.recorder = nil
    }

    try? FileManager.default.removeItem(at: segmentDirectory)
    try? FileManager.default.removeItem(at: destination)
  }

  private func startSegment() async throws {
    let segmentURL = segmentDirectory.appendingPathComponent("segment-\(segmentURLs.count).mp4")
    let recorder = Aperture.Recorder()
    recorder.onError = { error in
      Output.send(Message(event: "failure", message: error.localizedDescription))
    }

    do {
      try await recorder.start(
        target: .screen,
        options: try options.recordingOptions(destination: segmentURL)
      )
      segmentURLs.append(segmentURL)
      self.recorder = recorder
    } catch {
      try? FileManager.default.removeItem(at: segmentURL)
      throw error
    }
  }

  private func mergeSegments() async throws {
    let composition = AVMutableComposition()
    var videoTracks: [AVMutableCompositionTrack] = []
    var audioTracks: [AVMutableCompositionTrack] = []
    var insertionTime = CMTime.zero

    for segmentURL in segmentURLs {
      let asset = AVURLAsset(url: segmentURL)
      let duration = try await asset.load(.duration)
      try await insertTracks(
        from: asset,
        mediaType: .video,
        into: composition,
        tracks: &videoTracks,
        at: insertionTime
      )
      try await insertTracks(
        from: asset,
        mediaType: .audio,
        into: composition,
        tracks: &audioTracks,
        at: insertionTime
      )
      insertionTime = insertionTime + duration
    }

    guard !videoTracks.isEmpty else {
      throw NSError(
        domain: "KapCapture",
        code: 2,
        userInfo: [NSLocalizedDescriptionKey: "The recording did not contain a video track."]
      )
    }

    guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetPassthrough) else {
      throw NSError(
        domain: "KapCapture",
        code: 3,
        userInfo: [NSLocalizedDescriptionKey: "Could not create the recording exporter."]
      )
    }

    exporter.outputURL = destination
    exporter.outputFileType = .mp4
    exporter.shouldOptimizeForNetworkUse = true
    await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
      exporter.exportAsynchronously {
        continuation.resume()
      }
    }

    guard exporter.status == .completed else {
      throw exporter.error ?? NSError(
        domain: "KapCapture",
        code: 4,
        userInfo: [NSLocalizedDescriptionKey: "Could not merge recording segments."]
      )
    }
  }

  private func insertTracks(
    from asset: AVAsset,
    mediaType: AVMediaType,
    into composition: AVMutableComposition,
    tracks: inout [AVMutableCompositionTrack],
    at insertionTime: CMTime
  ) async throws {
    let sourceTracks = try await asset.loadTracks(withMediaType: mediaType)
    for (index, sourceTrack) in sourceTracks.enumerated() {
      if tracks.indices.contains(index) == false {
        guard let track = composition.addMutableTrack(
          withMediaType: mediaType,
          preferredTrackID: kCMPersistentTrackID_Invalid
        ) else {
          throw NSError(
            domain: "KapCapture",
            code: 5,
            userInfo: [NSLocalizedDescriptionKey: "Could not create a \(mediaType.rawValue) track."]
          )
        }

        tracks.append(track)
      }

      let timeRange = try await sourceTrack.load(.timeRange)
      try tracks[index].insertTimeRange(timeRange, of: sourceTrack, at: insertionTime)
    }
  }
}

@main
private struct KapCapture {
  static func main() async {
    if CommandLine.arguments.dropFirst().first == "--check" {
      Output.send(Message(event: "ready"))
      return
    }

    guard let encodedOptions = CommandLine.arguments.dropFirst().first else {
      Output.send(Message(event: "failure", message: "Missing capture options."))
      exit(EXIT_FAILURE)
    }

    let session: CaptureSession
    do {
      let options = try JSONDecoder().decode(CaptureOptions.self, from: Data(encodedOptions.utf8))
      session = CaptureSession(options: options)
      try await session.start()
      Output.send(Message(event: "started"))
    } catch {
      Output.send(Message(event: "failure", message: errorMessage(error)))
      exit(EXIT_FAILURE)
    }

    while let command = readLine() {
      do {
        switch command {
        case "pause":
          try await session.pause()
          Output.send(Message(event: "paused"))
        case "resume":
          try await session.resume()
          Output.send(Message(event: "resumed"))
        case "isPaused":
          Output.send(Message(event: "pausedState", value: session.isPaused))
        case "stop":
          try await session.stop()
          Output.send(Message(event: "stopped"))
          return
        case "cancel":
          await session.cancel()
          Output.send(Message(event: "cancelled"))
          return
        default:
          throw NSError(
            domain: "KapCapture",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "Unknown command: \(command)"]
          )
        }
      } catch {
        await session.cancel()
        Output.send(Message(event: "failure", message: errorMessage(error)))
        exit(EXIT_FAILURE)
      }
    }

    try? await session.stop()
  }
}
