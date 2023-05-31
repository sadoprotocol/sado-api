import * as btc from "bitcoinjs-lib";

export const raw = {
  decode,
};

/**
 * Attempt to retrieve a raw unsigned transaction from the offer string.
 *
 * @param offer - Encoded offer transaction.
 *
 * @returns The raw tx or undefined if it could not be parsed.
 */
function decode(offer: string): any | undefined {
  try {
    return btc.Transaction.fromHex(offer);
  } catch (error) {
    return undefined;
  }
}
