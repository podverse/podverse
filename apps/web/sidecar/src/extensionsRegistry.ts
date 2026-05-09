export type SidecarExtensionManifest = {
  cspSources?: string[];
};

// Keep in sync with apps/web/src/lib/extensions/registry.ts.
export const sidecarExtensionRegistry: SidecarExtensionManifest[] = [
  {
    cspSources: ['https://static.cloudflareinsights.com'],
  },
];
