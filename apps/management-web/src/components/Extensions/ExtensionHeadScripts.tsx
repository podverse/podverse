import { resolveActiveExtensions } from '../../lib/extensions/resolveActiveExtensions';

function toDataAttributes(dataAttrs: Record<string, string> | undefined): Record<string, string> {
  if (dataAttrs === undefined) {
    return {};
  }

  const attrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(dataAttrs)) {
    attrs[`data-${key}`] = value;
  }

  return attrs;
}

export async function ExtensionHeadScripts() {
  const activeExtensions = await resolveActiveExtensions();
  if (activeExtensions.length === 0) {
    return null;
  }

  const scripts: React.ReactNode[] = [];

  for (const { manifest, resolved } of activeExtensions) {
    const headScripts = manifest.requires.web?.headScripts;
    if (headScripts === undefined) {
      continue;
    }

    const descriptors = headScripts({ config: resolved.config });
    for (const [index, descriptor] of descriptors.entries()) {
      scripts.push(
        <script
          key={`${manifest.id}-${descriptor.src}-${index}`}
          src={descriptor.src}
          defer={descriptor.defer}
          async={descriptor.async}
          {...toDataAttributes(descriptor.dataAttrs)}
        />
      );
    }
  }

  if (scripts.length === 0) {
    return null;
  }

  return <>{scripts}</>;
}
