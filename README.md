# Kap

[中文说明](README_CN.md)

Kap is an open-source screen recorder for macOS.

## Features

- Record a selected region with the cursor, click highlights, system audio, and microphone audio.
- Pause and resume recordings from the menu bar.
- Trim, resize, change frame rate, and export as MP4, HEVC, AV1, WebM, GIF, or APNG.
- Use VideoToolbox hardware acceleration for H.264 and HEVC exports.
- Save exports, copy supported formats to the clipboard, or open them in another app.
- Run natively on Apple silicon and Intel Macs.

## Install

Download the latest DMG from [GitHub Releases](https://github.com/rrbe/Kap/releases). Choose `arm64` for Apple silicon or `x64` for an Intel Mac. Kap requires macOS 13 or newer.

Releases are ad-hoc signed, are not notarized by Apple, and must be upgraded manually. After copying Kap to `/Applications`, remove the quarantine attribute before the first launch:

```sh
xattr -dr com.apple.quarantine /Applications/Kap.app
```

Only run this command for a release downloaded from this repository that you trust.

## Usage

Click the menu bar icon, select a region, and press the record button. Click the icon again to stop. While recording, Option-click the icon to pause, or right-click it for more actions.

Use the editor to adjust the clip and choose a format and output action before converting.

## Development

```sh
nvm install
corepack enable
pnpm install --frozen-lockfile
pnpm start
```

Run `pnpm test` for lint and automated tests, and `pnpm build` for a production build.

## License

Kap is available under the [MIT License](LICENSE.md).
