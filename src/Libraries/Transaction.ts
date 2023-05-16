import { Transaction, Vout } from "../Entities/Transaction";
import { Lookup } from "../Services/Lookup";
import { BTC_TO_SAT } from "./Bitcoin";

/**
 * Check if a UTXO on a transaction is spent.
 *
 * @param txid    - Root transaction to trace spent state from.
 * @param n       - Vout position containing the receiving address.
 * @param network - Network the transaction is registered on.
 *
 * @returns True if the UTXO is spent, false otherwise.
 */
export async function getUTXOState(
  txid: string,
  n: number,
  lookup: Lookup
): Promise<{
  address: string;
  spent: boolean;
}> {
  const tx = await lookup.getTransaction(txid);
  if (tx === undefined) {
    throw new Error(`Transaction ${txid} not found.`);
  }
  const vout = tx.vout[n];
  if (vout === undefined) {
    throw new Error(`Vout ${txid}.vout[${n}] not found.`);
  }
  const address = vout.scriptPubKey.address;
  const txs = await lookup.getUnspents(address);
  for (const tx of txs) {
    if (tx.txid === txid) {
      return { address, spent: false };
    }
  }
  return { address, spent: true };
}

/**
 * Check if provided vout has pending ordinals present.
 *
 * @param vout - Vout to check.
 *
 * @returns `true` if vout has ordinals, `false` otherwise.
 */
export function hasPendingOrdinals(vout: Vout): boolean {
  return vout.ordinals.length > 0;
}

/**
 * Get value of a vout in satoshis that is associated with the provided address.
 *
 * @param tx      - Transaction to extract value from.
 * @param address - Address to get value for.
 *
 * @returns Value of the vout in satoshis or `undefined` if no value is found.
 */
export function getAddressVoutValue(tx: Transaction, address: string): number | undefined {
  const vout = tx.vout.find((v) => v.scriptPubKey.address === address);
  if (vout === undefined) {
    return undefined;
  }
  return Math.floor(vout.value * BTC_TO_SAT);
}

/**
 * Parse a location string into a tuple of txid and vout.
 *
 * @param location - Location string in the format of `txid:vout`.
 *
 * @returns Tuple of txid and vout.
 */
export function parseLocation(location: string): [string, number] {
  const [txid, vout] = location.split(":");
  if (txid === undefined || vout === undefined) {
    throw new Error("Invalid location");
  }
  return [txid, parseInt(vout)];
}
