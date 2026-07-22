# Maintaining

## Development

Run `nvm install && corepack enable`, then `pnpm install --frozen-lockfile`. `pnpm start` builds the main process, starts the Vite development server, and launches Kap.

Run `pnpm test` before submitting changes. Run `pnpm build` when a change affects packaging or the renderer build.

For local use, `make build` builds a DMG with the first Apple Development identity in the keychain, and `make install` also replaces `/Applications/Kap.app`. Use `make dmg-adhoc` to build an ad-hoc-signed DMG for sharing or release testing.

## Releases

Releases are ad-hoc signed with electron-builder and are not notarized. No Developer ID certificate or Apple account is required. GitHub Actions builds arm64 and x64 packages on native runners, runs the tests, verifies each app's signature and binary architecture, verifies the DMG, and uploads the release files as workflow artifacts.

Ad-hoc signatures do not provide a stable identity across versions, so releases support manual upgrades only. Do not add automatic updates without first introducing and protecting a stable signing identity.

1. Update the version in `package.json` and commit it, for example `chore: release 3.7.0`.
2. Tag and push the release: `git tag -a "v3.7.0" -m "v3.7.0" && git push --follow-tags`.
3. Wait for both architecture jobs in the GitHub Actions CI run to complete.
4. Create a draft under [GitHub Releases](https://github.com/rrbe/Kap/releases) for the tag.
5. Download the `Kap-arm64` and `Kap-x64` workflow artifacts and attach both DMGs to the draft.
6. Confirm `codesign --verify --deep --strict` passes, `codesign --display --verbose=4` reports `Signature=adhoc`, and `hdiutil verify` passes for both artifacts.
7. State that the release is not notarized and requires manual upgrades, include the README quarantine command, and publish the release.
