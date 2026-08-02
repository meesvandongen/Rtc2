# Changesets

Every change that a consumer of `@rtc2/react-table` could notice ships with a
changeset: a small markdown file describing the change and how far it moves the
version. They accumulate on `main` and are collapsed into a release in one go,
which is why the version in `package.json` is never bumped by hand.

## Adding one

```sh
pnpm changeset
```

Pick the bump and write the entry in the present tense, addressed to someone
reading the changelog to decide whether to upgrade — what changed and what it
means for their code, not which files were touched.

- **patch** — a fix, or anything invisible from the outside.
- **minor** — a new option, component, export, or localization key.
- **major** — a removed or renamed export, or a change in behaviour that an
  existing table would notice.

A change with no consumer-visible effect — CI, stories, the README — needs no
changeset.

## Releasing

`.github/workflows/release.yml` opens a "Version Packages" pull request as soon
as an unreleased changeset lands on `main`. Merging it applies the bumps, writes
`CHANGELOG.md`, and publishes to npm.

Full documentation lives in the
[changesets repository](https://github.com/changesets/changesets).
