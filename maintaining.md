# Maintaining

## Developing Kap

Run `nvm install && corepack enable`, then `pnpm install --frozen-lockfile`. `pnpm start` builds the main process, starts the Vite development server, and launches Kap.

We strongly recommend installing an [XO editor plugin](https://github.com/sindresorhus/xo#editor-plugins) for JavaScript linting and a [Stylelint editor plugin](https://github.com/stylelint/stylelint/blob/master/docs/user-guide/integrations/editor.md) for CSS linting. Both of these support auto-fix on save.

## Releasing a new version

The macOS release requires a `Developer ID Application` certificate and Apple notarization credentials. Store these as CircleCI secrets; never commit them:

- `CSC_LINK` and `CSC_KEY_PASSWORD` for the exported `.p12` certificate.
- Either `APPLE_API_KEY`, `APPLE_API_KEY_ID`, and `APPLE_API_ISSUER`, or the Apple ID notarization variables supported by electron-builder.

CircleCI builds arm64 natively and x64 under Rosetta with an x64 Node installation. Each job runs the test suite, packages DMG/ZIP artifacts, and rejects target apps containing a wrong-architecture Mach-O file. The metadata job combines both ZIP files into one `latest-mac.yml` so electron-updater can select the correct architecture.

- Go to https://github.com/wulkano/kap/releases
- Click `Draft a new release`
- Write the new version, prefixed with `v`, in the `Tag version` field (Example: `v2.0.0`)
- Leave the `Release title` field blank
- Write release notes
- Click `Save draft`
- Change `version` [here](https://github.com/wulkano/kap/blob/main/package.json#L4) to the new version and use the version number as the commit title (Example: `2.0.0`)
- CircleCI will build the two architectures and expose the DMG, ZIP, blockmap, and `latest-mac.yml` artifacts.
- Verify both build jobs are green. Attach all release artifacts to the GitHub draft.
- Confirm `codesign --verify --deep --strict`, `spctl --assess --type exec`, and `xcrun stapler validate` pass for both apps before publishing.
- Publish the release only after the update metadata and both architecture-specific ZIP files are attached.

## Releasing a new beta version

- Check out the `beta` branch: `git switch beta`
- Merge the current `main` branch: `git merge origin/main`
- Change the `version` number in `package.json`
- Commit the beta version and any beta customizations as a new conventional commit.
- Push the beta branch without rewriting its history.
- Tag a release with the version number in package.json and push it: `git tag -a "v2.0.0-beta.3" -m "v2.0.0-beta.3" && git push --follow-tags`
- Create a GitHub release draft for the tag and mark it as a pre-release.
- When CircleCI succeeds, attach both architecture artifacts and the combined update metadata, verify signing/notarization, and publish the draft.
