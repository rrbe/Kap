// swift-tools-version: 5.7

import PackageDescription

let package = Package(
  name: "KapCapture",
  platforms: [
    .macOS(.v13)
  ],
  dependencies: [
    .package(url: "https://github.com/wulkano/Aperture.git", exact: "3.0.0")
  ],
  targets: [
    .executableTarget(
      name: "kap-capture",
      dependencies: [
        .product(name: "Aperture", package: "Aperture")
      ]
    )
  ]
)
