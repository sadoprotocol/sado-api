import * as btc from "bitcoinjs-lib";

import { IPFSOffer } from "../../../../Entities/IPFS";
import { OfferValidationFailed } from "../../../Exceptions/OfferException";

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
 * @param offer - IPFS offer object.
 *
 * @returns `true` if a signature exists in the inputs of the transaction.
 */
export function validateRawTx({ offer }: IPFSOffer): boolean {
  try {
    const tx = btc.Transaction.fromHex(offer);
    for (const input of tx.ins) {
      if (input.script.toString()) {
        return true;
      }
    }
  } catch (err) {
    return false;
  }
  throw new OfferValidationFailed("Unable to verify offer validity", { offer });
}
