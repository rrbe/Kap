# Maintaining

## Developing Kap

Run `nvm install && corepack enable`, then `pnpm install --frozen-lockfile`. `pnpm start` builds the main process, starts the Vite development server, and launches Kap.

We strongly recommend installing an [XO editor plugin](https://github.com/sindresorhus/xo#editor-plugins) for JavaScript linting and a [Stylelint editor plugin](https://github.com/stylelint/stylelint/blob/master/docs/user-guide/integrations/editor.md) for CSS linting. Both support auto-fix on save.

## Releasing a new version

Releases are ad-hoc signed with electron-builder and are not notarized. No Developer ID certificate, Apple account, or original-project signing secret is required. CircleCI builds arm64 natively and x64 under Rosetta with an x64 Node installation. Each job runs the test suite, packages a DMG, verifies the ad-hoc signature, and rejects apps containing a wrong-architecture Mach-O file.

Ad-hoc signatures do not provide a stable identity across versions, so releases support manual upgrades only. Do not restore automatic updates without first introducing and protecting a stable signing identity.

1. Update the version in `package.json` and commit it using the version number as the summary, for example `chore: release 3.7.0`.
2. Tag and push the release: `git tag -a "v3.7.0" -m "v3.7.0" && git push --follow-tags`.
3. Create a draft under [GitHub Releases](https://github.com/rrbe/Kap/releases) for that tag.
4. Wait for both CircleCI architecture jobs to complete.
5. Attach both architecture DMGs to the draft.
6. Confirm `codesign --verify --deep --strict` passes and `codesign --display --verbose=4` reports `Signature=adhoc` for both apps.
7. Verify both DMGs with `hdiutil verify`, document that the release is not notarized and requires manual upgrades, and publish it.

The README installation command must remain in the release notes because Gatekeeper does not trust ad-hoc signatures.

## Releasing a new beta version

1. Check out the `beta` branch: `git switch beta`.
2. Merge the current `main` branch: `git merge origin/main`.
3. Update the version in `package.json` and commit the beta version with a conventional commit.
4. Push the beta branch without rewriting its history.
5. Tag and push the version, for example `git tag -a "v3.7.0-beta.1" -m "v3.7.0-beta.1" && git push --follow-tags`.
6. Create a GitHub release draft for the tag and mark it as a pre-release.
7. Attach both architecture DMGs after CircleCI succeeds, verify the ad-hoc signatures, and publish the draft.
