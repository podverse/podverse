# Cloudflare Web Analytics extension

This extension adds optional, opt-in Cloudflare Web Analytics to Podverse hosts. It
emits the Cloudflare beacon script for rough page-view analytics. The token is a
public beacon identifier, not an operator credential.

## Required switches

- `EXTENSIONS_ENABLED=true`
- `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED=true`

## Configuration

- `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN=<beacon-token>`
- `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_BEACONURL=<optional-custom-beacon-url>`

## Management override path

Use the management UI at `/extensions/cloudflare-web-analytics` to toggle and edit
settings. Per the extension resolution order, persisted DB rows take precedence over
environment values.

## Privacy note

Operator-convenience analytics. Collection may fail or be incomplete for many
reasons; do not rely on this for billing, compliance, or critical operational
decisions.

## License

Licensed under AGPL-3.0. See `LICENSE`.
