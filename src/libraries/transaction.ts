import * as btc from "bitcoinjs-lib";

import { Transaction, Vout } from "../Entities/Transaction";
import { BTC_TO_SAT } from "./Bitcoin";

/**
 * Check if the provided raw transaction hex has a signature.
 *
 * [TODO] Add the possibility to check if the owner/maker/taker of the transaction
 *        is the signer. I have done some preliminary work on this, but it is not
 *        complete and needs more discovery.
 *
 *        Initially tried to extract the address from the publicKeyHash value of
 *        the `script`. But since the `script` cannot be guaranteed to have this
 *        information it is not a reliable way to verify the signer.
 *
 * @param rawTx - Raw transaction hex string.
 *
 * @returns `true` if a signature exists in the inputs of the transaction.
 */
export function hasSignature(rawTx: string): boolean {
  const tx = btc.Transaction.fromHex(rawTx);
  for (const input of tx.ins) {
    if (input.script.toString()) {
      return true;
    }
  }
  return false;
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
