import type {
  GooglePlayClient,
  GooglePlayVoidedPurchasesPage,
  ListVoidedPurchasesParams,
} from './PlayDeveloperClient.js';

export async function pollGooglePlayVoidedPurchases(
  client: GooglePlayClient,
  params: ListVoidedPurchasesParams = {}
): Promise<GooglePlayVoidedPurchasesPage> {
  return client.listVoidedPurchases(params);
}
