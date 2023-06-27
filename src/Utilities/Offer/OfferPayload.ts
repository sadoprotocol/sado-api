export function toHex(offer: OfferPayload): string {
  return Buffer.from(
    JSON.stringify({
      ts: offer.ts,
      origin: offer.origin,
      offer: offer.offer,
      taker: offer.taker,
    })
  ).toString("hex");
}

export type OfferPayload = {
  ts: number;
  origin: string;
  offer: string;
  taker: string;
};
