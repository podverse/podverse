---
description: "Converted from github-actions-yaml.mdc"
---
# GitHub Actions YAML Best Practices, glob pattern(s) for applicable files: .github/workflows/_.yml, .github/workflows/_.yaml

## Quote Style in YAML Files

YAML files use **double quotes** for strings (configured via override in `.prettierrc.json`).

- JavaScript/TypeScript use single quotes
- YAML files use double quotes
- This is enforced consistently by both IDE save and `npm run lint:fix`

## Critical Rules

### 1. Multi-line Shell Scripts with Special Characters

When a `run:` block contains shell scripts that generate strings with markdown or special characters, use heredocs instead of quoted strings.

**Problem:**

```yaml
run: |
  BODY="## Title
  **Bold**: value"  # ❌ ** interpreted as YAML alias
```

**Solution:**

```yaml
run: |
  BODY=$(cat <<EOF
  ## Title
  **Bold**: value
  EOF
  )  # ✅ Heredoc prevents YAML parsing issues
```

### 2. YAML Special Characters to Watch

These characters have special meaning in YAML and can cause parsing errors:

- `*` - Alias reference (at start of line or value)
- `&` - Anchor definition
- `@` - Reserved for future use
- `` ` `` - Reserved for future use
- `{`, `}` - Flow mappings
- `[`, `]` - Flow sequences

### 3. When to Use Heredocs in GitHub Actions

Use heredocs when:

- Generating markdown with `**bold**`, `*italic*`, or lists
- Creating multi-line content with variable interpolation
- Building JSON or YAML within shell scripts
- Concatenating multiple conditional sections

**Heredoc patterns:**

```bash
# Basic heredoc
VAR=$(cat <<EOF
content here
EOF
)

# With conditional content
VAR=$(cat <<EOF
Always here
$([ -n "$VAR" ] && echo "Conditional line")
EOF
)

# Nested heredoc
OUTER=$(cat <<EOF
Outer content
$([ condition ] && cat <<INNER
Nested content
INNER
)
EOF
)
```

### 4. Validation

Always validate YAML syntax after editing workflows:

```bash
# Python validation
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/file.yml'))"

# Or use npm lint
npm run lint:fix
```

## Common Pitfalls

1. **String concatenation in YAML**: Avoid `VAR="${VAR}more"` when content has special chars
2. **Unquoted values**: Always quote workflow inputs that might contain special characters
3. **Indentation mixing**: Use spaces consistently (2 or 4), never mix with tabs

## Examples

### Bad: String Concatenation with Special Characters

```yaml
run: |
  BODY="## Title
  **Field**: ${VALUE}"
  BODY="${BODY}
  - [ ] Item with *asterisk*"  # ❌ YAML parsing error
```

### Good: Heredoc with Conditional Logic

```yaml
run: |
  BODY=$(cat <<EOF
  ## Title
  **Field**: ${VALUE}
  $([ -n "$OPTIONAL" ] && echo "**Optional**: ${OPTIONAL}")
  - [ ] Item with *asterisk*
  EOF
  )  # ✅ Safe and readable
```

### Good: Nested Heredocs for Complex Content

```yaml
run: |
  MESSAGE=$(cat <<EOF
  Main content
  $([ "$CONDITION" = "true" ] && cat <<NESTED
  ### Conditional Section
  This only appears when condition is true
  NESTED
  )
  EOF
  )
```

## See Also

- GitHub Actions syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- YAML specification: https://yaml.org/spec/1.2.2/
- Bash heredoc syntax: https://www.gnu.org/software/bash/manual/html_node/Redirections.html
