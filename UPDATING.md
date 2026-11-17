# Updating the upstream version

## Determining the upstream version

Documenso is the `documenso/documenso` Docker Hub image, pinned by `documensoVersion` in `startos/manifest/index.ts`. Its tags are the GitHub release tags, `v`-prefixed:

```bash
gh release view -R documenso/documenso --json tagName -q .tagName
docker manifest inspect documenso/documenso:<tag> | jq -r '.manifests[].platform.architecture'
```

PostgreSQL is `postgres:15-alpine`, the major version upstream's compose files and CI run. Raise it only when upstream does: a major-version change needs a dump and restore, not an image bump.

## Applying the bump

1. Set `documensoVersion` in `startos/manifest/index.ts` to the new tag, `v` included.
2. Set `version` in `startos/versions/current.ts` to the tag without its `v`, with a `:0` revision.
3. Read the release notes for changes to the environment variables in `startos/main.ts`, the signup endpoint and `User`/`Session` fields used by `applyAdminScript`, and `@node-rs/bcrypt` in `startos/actions/setAdminCredentials.ts`.
