'use client';

import { ManagementUserMenu } from '../../../components/ManagementUserMenu/ManagementUserMenu';
import { type CurrentUser } from '../../../lib/requests/auth';

type DashboardNavRightProps = {
  user: CurrentUser;
};

export function DashboardNavRight({ user }: DashboardNavRightProps) {
  return <ManagementUserMenu user={user} />;
}
