import type { AppValueRecipient } from '@podverse/helpers';
import { getConfig } from '../../config';

type GetAppValueRecipientParams = {
  type: string;
  recipientType?: string | null;
  final_amount: number;
};

export const getAppValueRecipient = ({
  type,
  recipientType,
  final_amount,
}: GetAppValueRecipientParams): AppValueRecipient | null => {
  if (type !== 'lightning') {
    return null;
  }

  const config = getConfig();
  const lnaddressConfig = config.public.app_value.lightning_lnaddress;
  const nodeConfig = config.public.app_value.lightning_node;
  const hasLnaddress = Boolean(lnaddressConfig.address);
  const hasNode = Boolean(nodeConfig.address);
  const resolvedRecipientType =
    recipientType ?? (hasLnaddress ? 'lnaddress' : hasNode ? 'node' : null);

  if (resolvedRecipientType === 'lnaddress') {
    if (!lnaddressConfig.address || !lnaddressConfig.name) {
      return null;
    }
    return {
      type: 'lnaddress',
      address: lnaddressConfig.address,
      name: lnaddressConfig.name,
      normalized_split: 100,
      final_amount,
    };
  }

  if (resolvedRecipientType === 'node') {
    if (!nodeConfig.address || !nodeConfig.name) {
      return null;
    }
    return {
      type: 'node',
      address: nodeConfig.address,
      name: nodeConfig.name,
      custom_key: nodeConfig.custom_key,
      custom_value: nodeConfig.custom_value,
      normalized_split: 100,
      final_amount,
    };
  }

  return null;
};
