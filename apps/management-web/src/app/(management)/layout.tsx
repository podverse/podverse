import type { ReactNode } from 'react';

import { ManagementAppLayout } from '../../components/ManagementAppLayout/ManagementAppLayout';

export default function ManagementRouteGroupLayout({ children }: { children: ReactNode }) {
  return <ManagementAppLayout>{children}</ManagementAppLayout>;
}
