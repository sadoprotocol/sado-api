import * as btc from "bitcoinjs-lib";

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
