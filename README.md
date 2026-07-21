# Kap

[中文说明](README_CN.md)

Kap is an open-source screen recorder for macOS. This repository is an independently maintained fork focused on faster startup and export, current macOS support, native Apple silicon and Intel builds, and room for new recording features.

> This project is forked from [wulkano/Kap](https://github.com/wulkano/Kap). It is not affiliated with, endorsed by, or maintained by the original authors. The original copyright and MIT license are preserved.

## Why rebuild Kap?

The upstream project has not received a feature release since October 2022, and its only later `main` commit updated CI configuration in February 2024. Meanwhile, its runtime and native dependencies aged past the versions supported by current macOS and Node.js releases.

This fork exists to address the problems that had accumulated:

- **Slow recorder opening.** The original selector destroyed and recreated a Cropper `BrowserWindow` for every display each time it opened. Closing one Cropper also triggered the all-Cropper cleanup path, so opening the selector repeatedly paid for window teardown, renderer reloads, and multi-display synchronization. The fork keeps a reusable window pool instead.
- **Slow exports.** Unchanged MP4 recordings were transcoded unnecessarily, and software-only H.264/HEVC encoding consumed substantial CPU and time. The fork adds a clone/copy fast path and optional VideoToolbox hardware encoding while retaining software fallbacks.
- **Incomplete architecture support.** Several bundled helpers were Intel-only, so an apparently native Apple silicon build could still enter Rosetta on common paths. The final app now uses target-architecture or universal Mach-O binaries throughout and is built separately for arm64 and x64.
- **Unnecessary web framework overhead.** Kap renderer pages are fully local static pages; they do not use server-side rendering. Next.js and its SSR-oriented build pipeline added weight and compatibility problems without providing runtime value, so the renderer now uses Vite.
- **A blocked feature path.** The maintained codebase is intended to support additions such as recording countdowns, clearer on-screen prompts, and further capture and editing improvements.

## What changed?

- Replaced the legacy AVFoundation capture executable with a universal ScreenCaptureKit helper supporting system audio, microphone input, pause/resume, cancellation, and cleanup.
- Replaced Electron `remote` access with context-isolated renderer processes and a typed preload/IPC boundary.
- Upgraded Electron, React, TypeScript, and the test toolchain; replaced Next.js with Vite.
- Reused Cropper windows and cached audio-device discovery to remove repeated work from common UI paths.
- Added unchanged-MP4 copy, VideoToolbox H.264/HEVC encoding with software fallback, and FFmpeg-native GIF generation.
- Replaced Intel-only native packages with one universal Swift system helper.
- Migrated from Yarn to pnpm, reduced direct dependencies, and removed known production dependency vulnerabilities.
- Added separate arm64/x64 CI packaging and packaged-binary architecture checks.

The implementation plan, measurements, and validation details are in [MODERNIZATION_PLAN.md](MODERNIZATION_PLAN.md) and [docs/modernization-baseline.md](docs/modernization-baseline.md).

## Download and install

Download the latest DMG from [GitHub Releases](https://github.com/rrbe/Kap/releases). Choose the `arm64` build for Apple silicon or the `x64` build for an Intel Mac.

Kap requires macOS 13 or newer.

Automatic updates are disabled because ad-hoc signatures do not provide a stable identity across releases. Install upgrades manually from the Releases page.

### Gatekeeper notice

Releases from this fork are ad-hoc signed and are not notarized by Apple. This removes the dependency on the original authors' Developer ID certificate, but macOS will not treat the app as an identified-developer release.

After copying Kap to `/Applications`, remove the quarantine attribute before the first launch:

```sh
xattr -dr com.apple.quarantine /Applications/Kap.app
```

Only bypass quarantine for a release downloaded from this repository and trusted by you.

## Usage

Click the menu bar icon, select a region, and press the record button. Click the menu bar icon again to stop recording.

While recording, Option-click the menu bar icon to pause, or right-click it for more actions.

## Development

```sh
nvm install
corepack enable
pnpm install --frozen-lockfile
pnpm start
```

Run `pnpm test` for lint and the automated test suite. See [contributing.md](contributing.md) for contribution details and [docs/plugins.md](docs/plugins.md) for the plugin API.

## License and attribution

Kap is available under the [MIT License](LICENSE.md). This fork retains the original project history, copyright notice, and contributor attribution while being maintained independently from the original authors.
