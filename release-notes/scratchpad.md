## Publish audit dependency pins

- Surfaces: api, management-api, workers, web, management-web (root lockfile)
- Change: production installs resolve `follow-redirects` 1.16.2, `glob` 14.0.3, `minimatch` 11.0.3, and `joi` 18.3.1. Those releases close the moderate and high advisories that blocked the develop-to-staging sync.
- Who notices: operators promoting develop to staging. Request handling is unchanged aside from the patched libraries.
- Operator steps: none beyond the usual staging sync
