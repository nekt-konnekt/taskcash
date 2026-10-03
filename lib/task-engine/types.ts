export type RewardAsset = "NGN_CASH" | "CONTENT_CREDIT" | "BONUS_POINT";
export type TaskStatus = "draft" | "live" | "paused" | "expired";

export type NormalizedOffer = {
  providerSlug: string;
  externalId: string;
  title: string;
  description?: string;
  category?: string;
  countryCodes: string[];
  advertiserValue: number;
  userReward: number;
  rewardAsset: RewardAsset;
  terms: Record<string, unknown>;
  startsAt?: string;
  expiresAt?: string;
};

export type ProviderConversion = {
  externalConversionId: string;
  externalOfferId: string;
  userExternalId: string;
  status: "pending" | "approved" | "reversed" | "rejected";
  advertiserValue: number;
  userReward: number;
  rawPayload: Record<string, unknown>;
};

export interface OfferProvider {
  slug: string;
  normalizeOffers(input: unknown): NormalizedOffer[];
  verifyConversion(request: Request): Promise<ProviderConversion>;
  buildLaunchUrl(offer: NormalizedOffer, userExternalId: string): string;
}