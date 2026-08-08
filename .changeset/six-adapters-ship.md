---
'@mvd/table': minor
---

Ship the MUI, Mantine, Radix and `@lolmath/ui` component-registry adapters as
optional subpath exports — `@mvd/table/mui`, `@mvd/table/mantine`,
`@mvd/table/radix` (+ `@mvd/table/radix.css`) and `@mvd/table/lolmath`
(+ `@mvd/table/lolmath.css`). Each UI library is a peer dependency of its own
entry point only, marked optional in `peerDependenciesMeta`, so installing
`@mvd/table` pulls in none of them and importing the root export is
unaffected either way — see "UI library exports" in the README, including
why there is no `@mvd/table/shadcn`.
