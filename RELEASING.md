# Releasing @royaltyport/cli

1. Update package.json and package-lock.json together. Record breaking changes
   and migration instructions in CHANGELOG.md.
2. Run package-local unit tests and typecheck using Node 24 / npm 11.19.0.
   Tests builds, packs and smoke-tests the actual published files in GitHub
   Actions; do not run a local production build.
3. Require successful unit, Staging integration and package-artifacts jobs for
   the exact release commit, then merge through the protected Main PR.
4. Confirm the selected API release is deployed and accepted in Production
   before publishing a package that selects it by default.
5. Download the exact Main commit's npm-package artifact from Tests. Check
   its package name/version and its commit against the accepted release.
   Publish that tarball with npm publish <tarball> --access public --ignore-scripts
   --tag latest. npm authentication and account 2FA remain required; never
   commit credentials or include them in command arguments.
6. Verify the registry version, integrity and latest tag. Tag that accepted
   Main commit v<version>, and create the matching GitHub release using the
   changelog. Smoke-test the installed registry package.

CLI 3.0.0 supports only 2026-10-20.birch and removes the legacy release selectors
and Aster command/response surfaces. Publication must follow Production Birch
acceptance. Existing published packages remain available; see CHANGELOG.md for
the migration from 2.0.
