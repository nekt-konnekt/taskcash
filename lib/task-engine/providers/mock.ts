import type { OfferProvider, NormalizedOffer, ProviderConversion } from "../types";

export const mockProvider: OfferProvider = {
  slug: "mock",
  normalizeOffers(input: unknown): NormalizedOffer[] {
    if (!Array.isArray(input)) return [];
    return input.filter(Boolean) as NormalizedOffer[];
  },
  async verifyConversion(request: Request): Promise<ProviderConversion> {
    const body = await request.json();
    return body as ProviderConversion;
  },
  buildLaunchUrl(offer, userExternalId) {
    const url = new URL("https://example.com/offer");
    url.searchParams.set("offer", offer.externalId);
    url.searchParams.set("user", userExternalId);
    return url.toString();
  },
};