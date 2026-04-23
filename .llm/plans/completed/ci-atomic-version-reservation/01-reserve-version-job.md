# 01 — Add `reserve-version` job (podverse)

## Scope

Add a new job to [.github/workflows/publish-alpha.yml](../../../../.github/workflows/publish-alpha.yml)
that atomically reserves the next publish version `X.Y.Z-{suffix}.N` by creating
the matching Git tag at the workflow commit. The job runs **after** `validate` and
**before** `publish-base-images` / `publish-docker`.

In this step we **add** the new job and leave the old `validate` version-calc step
and `git-tag-prerelease` job in place. They are removed in `03-...`.

## Behavior

- Inputs:
  - `github.ref_name` (`alpha` | `beta` | `main`)
  - Optional `inputs.version_override`
- Suffix / float-tag mapping (podverse-specific — note `alpha` not `staging`):
  - `main`  → no suffix; `FLOAT_TAG=prod`;  `is_prod=true`
  - `alpha` → `alpha`;   `FLOAT_TAG=alpha`; `is_prod=false`
  - `beta`  → `beta`;    `FLOAT_TAG=beta`;  `is_prod=false`
- Loop logic and start hint: identical to metaboost
  (`curl` POST `/git/refs`, 422 → bump and retry for prerelease tags, smart start
  from `git ls-remote --tags`, `set -euo pipefail`, and no silent failure in the
  authoritative reservation path).
- Exact-tag safety (required): for `version_override` and `main`, HTTP 422 is
  accepted only when the existing tag already resolves to `${{ github.sha }}`;
  otherwise fail before publish. This must mirror metaboost behavior.

## Outputs

- `version`
- `float_tag`
- `is_prod`

## Job skeleton

```yaml
  reserve-version:
    needs: validate
    runs-on: ubuntu-latest
    permissions:
      contents: write
    outputs:
      version: ${{ steps.reserve.outputs.version }}
      float_tag: ${{ steps.reserve.outputs.float_tag }}
      is_prod: ${{ steps.reserve.outputs.is_prod }}
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Reserve next version
        id: reserve
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REF_NAME: ${{ github.ref_name }}
          SHA: ${{ github.sha }}
          OVERRIDE: ${{ inputs.version_override }}
          REPO: ${{ github.repository }}
        run: |
          set -euo pipefail

          BASE=$(node -p "require('./package.json').version" | sed 's/-.*//')
          case "$REF_NAME" in
            main)  SUFFIX=""      ; FLOAT=prod  ; IS_PROD=true  ;;
            alpha) SUFFIX="alpha" ; FLOAT=alpha ; IS_PROD=false ;;
            beta)  SUFFIX="beta"  ; FLOAT=beta  ; IS_PROD=false ;;
            *) echo "Unsupported ref $REF_NAME"; exit 1 ;;
          esac

          create_tag() {
            # $1 tag, $2 sha; sets LAST_CREATE_CODE and LAST_CREATE_BODY
            local tag="$1"
            local sha="$2"
            local body

            body=$(mktemp)
            LAST_CREATE_CODE=$(curl -sS -o "$body" -w "%{http_code}" \
              -H "Authorization: Bearer $GH_TOKEN" \
              -H "Accept: application/vnd.github+json" \
              -X POST "https://api.github.com/repos/${REPO}/git/refs" \
              -d "{\"ref\":\"refs/tags/${tag}\",\"sha\":\"${sha}\"}")
            LAST_CREATE_BODY=$(cat "$body")
            rm -f "$body"

            echo "create-ref attempt: tag=${tag} status=${LAST_CREATE_CODE}"
            if [ "$LAST_CREATE_CODE" != "201" ] && [ "$LAST_CREATE_CODE" != "422" ]; then
              echo "GitHub API error ${LAST_CREATE_CODE} while creating tag ${tag}:" >&2
              printf '%s\n' "$LAST_CREATE_BODY" >&2
              return 1
            fi
          }

          resolve_tag_commit_sha() {
            # $1 tag; echoes commit SHA that the tag resolves to
            local tag="$1"
            local ref_body ref_code obj_type obj_sha tag_body tag_code commit_sha

            ref_body=$(mktemp)
            ref_code=$(curl -sS -o "$ref_body" -w "%{http_code}" \
              -H "Authorization: Bearer $GH_TOKEN" \
              -H "Accept: application/vnd.github+json" \
              "https://api.github.com/repos/${REPO}/git/ref/tags/${tag}")
            if [ "$ref_code" != "200" ]; then
              echo "Failed to resolve existing tag ${tag} (HTTP ${ref_code})" >&2
              cat "$ref_body" >&2
              rm -f "$ref_body"
              return 1
            fi

            obj_type=$(jq -r '.object.type // ""' "$ref_body")
            obj_sha=$(jq -r '.object.sha // ""' "$ref_body")
            rm -f "$ref_body"

            if [ "$obj_type" = "commit" ]; then
              printf '%s\n' "$obj_sha"
              return 0
            fi

            if [ "$obj_type" = "tag" ]; then
              tag_body=$(mktemp)
              tag_code=$(curl -sS -o "$tag_body" -w "%{http_code}" \
                -H "Authorization: Bearer $GH_TOKEN" \
                -H "Accept: application/vnd.github+json" \
                "https://api.github.com/repos/${REPO}/git/tags/${obj_sha}")
              if [ "$tag_code" != "200" ]; then
                echo "Failed to resolve annotated tag object for ${tag} (HTTP ${tag_code})" >&2
                cat "$tag_body" >&2
                rm -f "$tag_body"
                return 1
              fi
              commit_sha=$(jq -r '.object.sha // ""' "$tag_body")
              rm -f "$tag_body"
              printf '%s\n' "$commit_sha"
              return 0
            fi

            echo "Unexpected Git ref object type '${obj_type}' for tag ${tag}" >&2
            return 1
          }

          require_same_sha_on_422() {
            # $1 tag
            local tag="$1"
            local existing_sha

            existing_sha=$(resolve_tag_commit_sha "$tag")
            if [ "$existing_sha" = "$SHA" ]; then
              echo "Tag ${tag} already points at ${SHA}; accepting 422."
              return 0
            fi

            echo "Refusing to reuse tag ${tag}: it points at ${existing_sha}, workflow commit is ${SHA}" >&2
            return 1
          }

          if [ -n "$OVERRIDE" ]; then
            VERSION="$OVERRIDE"
            create_tag "$VERSION" "$SHA"
            if [ "$LAST_CREATE_CODE" = "201" ]; then
              echo "Reserved explicit override tag ${VERSION}."
            elif [ "$LAST_CREATE_CODE" = "422" ]; then
              require_same_sha_on_422 "$VERSION"
            fi
          elif [ "$REF_NAME" = "main" ]; then
            VERSION="$BASE"
            create_tag "$VERSION" "$SHA"
            if [ "$LAST_CREATE_CODE" = "201" ]; then
              echo "Reserved RTM tag ${VERSION}."
            elif [ "$LAST_CREATE_CODE" = "422" ]; then
              require_same_sha_on_422 "$VERSION"
            fi
          else
            START=0
            if TAG_LINES=$(git ls-remote --tags origin "refs/tags/${BASE}-${SUFFIX}.*" 2>/dev/null); then
              MAX=$(printf '%s\n' "$TAG_LINES" | awk -v prefix="refs/tags/${BASE}-${SUFFIX}." '
                {
                  ref=$2
                  sub(/\^\{\}$/, "", ref)
                  if (index(ref, prefix) == 1) {
                    n=substr(ref, length(prefix) + 1)
                    if (n ~ /^[0-9]+$/) {
                      if (max == "" || (n + 0) > (max + 0)) {
                        max=n + 0
                      }
                    }
                  }
                }
                END {
                  if (max != "") {
                    print max
                  }
                }
              ')
              if [ -n "$MAX" ]; then
                START=$((MAX + 1))
              fi
              echo "Smart-start candidate N=${START}."
            else
              echo "git ls-remote failed for ${BASE}-${SUFFIX}; starting at N=0."
            fi

            N=$START
            while :; do
              VERSION="${BASE}-${SUFFIX}.${N}"
              create_tag "$VERSION" "$SHA"
              if [ "$LAST_CREATE_CODE" = "201" ]; then
                break
              fi
              if [ "$LAST_CREATE_CODE" = "422" ]; then
                echo "Tag ${VERSION} exists; incrementing N."
                N=$((N + 1))
                continue
              fi
              exit 1
            done
          fi

          echo "Reserved version: $VERSION"
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"
          echo "float_tag=$FLOAT" >> "$GITHUB_OUTPUT"
          echo "is_prod=$IS_PROD" >> "$GITHUB_OUTPUT"
```

## Key files

- [.github/workflows/publish-alpha.yml](../../../../.github/workflows/publish-alpha.yml)

## Verification (this step)

End-to-end verification happens in `06-verification.md`. For this commit:

- Workflow YAML still parses.
- `reserve-version` runs after `validate` and exposes `version` / `float_tag` /
  `is_prod`.
