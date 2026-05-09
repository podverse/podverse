import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import type {
  ExtensionConfigFieldMeta,
  ExtensionKind,
  ExtensionManifest,
} from '@podverse/extensions-sdk';

import { getRuntimeConfig } from '../../../../config/runtime-config-store';
import {
  getManagementSessionUser,
  MANAGEMENT_AUTH_COOKIE_NAME,
} from '../../../../lib/auth/serverManagementSession';
import { extensionRegistry } from '../../../../lib/extensions/registry';
import { canManageExtensions } from '../../../../lib/managementPermissions';
import { reqExtensionsGet } from '../../../../lib/requests/extensions';
import { ExtensionDetailPageClient } from './ExtensionDetailPageClient';

function findManifestById(id: string): ExtensionManifest | undefined {
  return extensionRegistry.find((manifest) => manifest.id === id);
}

type ExtensionDetailManifest = {
  id: string;
  name: string;
  description: string;
  kind: ExtensionKind;
  configSchema: {
    fields: Record<string, ExtensionConfigFieldMeta>;
    describe: unknown;
  };
};

export default async function ExtensionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getManagementSessionUser();
  if (!user) {
    redirect('/');
  }

  if (!canManageExtensions(user)) {
    redirect('/dashboard');
  }

  if (getRuntimeConfig().env.EXTENSIONS_ENABLED !== 'true') {
    redirect('/dashboard');
  }

  const { id } = await params;
  const manifest = findManifestById(id);
  if (!manifest) {
    redirect('/extensions');
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(MANAGEMENT_AUTH_COOKIE_NAME)?.value ?? '';
  if (token === '') {
    redirect('/');
  }

  try {
    const extension = await reqExtensionsGet(id, token);
    const manifestForClient: ExtensionDetailManifest = {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      kind: manifest.kind,
      configSchema: {
        fields: manifest.configSchema.fields,
        describe: manifest.configSchema.joi.describe(),
      },
    };

    return <ExtensionDetailPageClient extension={extension} manifest={manifestForClient} />;
  } catch {
    redirect('/extensions');
  }
}
