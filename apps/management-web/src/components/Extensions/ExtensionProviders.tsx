import type { ReactNode } from 'react';
import { cloneElement, isValidElement } from 'react';

import { resolveActiveExtensions } from '../../lib/extensions/resolveActiveExtensions';

function applyProviderNodes(children: ReactNode, providerNodes: ReactNode[]): ReactNode {
  return providerNodes.reduceRight<ReactNode>((currentChildren, node) => {
    if (isValidElement(node)) {
      return cloneElement(node, undefined, currentChildren);
    }

    return (
      <>
        {node}
        {currentChildren}
      </>
    );
  }, children);
}

export async function ExtensionProviders({ children }: { children: ReactNode }) {
  const activeExtensions = await resolveActiveExtensions();
  if (activeExtensions.length === 0) {
    return <>{children}</>;
  }

  let wrappedChildren: ReactNode = children;

  for (const { manifest, resolved } of activeExtensions) {
    const bodyProviders = manifest.requires.web?.bodyProviders;
    if (bodyProviders === undefined) {
      continue;
    }

    const providerNodes = bodyProviders({ config: resolved.config });
    wrappedChildren = applyProviderNodes(wrappedChildren, providerNodes);
  }

  return <>{wrappedChildren}</>;
}
