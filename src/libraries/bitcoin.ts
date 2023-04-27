import { ocean } from "../services/ocean";

/**
 * Satoshis in a BTC.
 */
export const BTC_TO_SAT = 100_000_000;

/**
 * Convert provided satoshis to BTC.
 *
 * @param sat - Satoshis to convert.
 *
 * @returns BTC value.
 */
export function satToBtc(sat: number): number {
  return sat / BTC_TO_SAT;
}

/**
 * Convert BTC to USD using the latest dexprices provided by the
 * DeFiChain ocean api.
 *
 * @param btc - BTC to convert.
 *
 * @returns USD value.
 */
export async function btcToUsd(btc: number): Promise<number> {
  const dexprices = await ocean.getDexPrices();
  const price = dexprices?.["BTC"]?.denominationPrice;
  if (price) {
    return btc * parseFloat(price);
  }
  return 0;
}
