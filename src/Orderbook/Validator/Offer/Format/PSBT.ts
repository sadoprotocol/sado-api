import * as btc from "bitcoinjs-lib";

import { IPFSOffer, IPFSOrder } from "../../../../Entities/IPFS";
import { parseLocation } from "../../../../Libraries/Transaction";
import { OfferValidationFailed } from "../../../Exceptions/OfferException";

/**
 * Attempt to validate the offer string as a PSBT. If the offer is not a PSBT
 * we return `false`, otherwise we validate the order input and return `true`.
 *
 * If the offer is a PSBT, an error will be thrown if the PSBT is not valid.
 *
 * @param offer - IPFS offer object.
 * @param order - IPFS order object.
 *
 * @returns `true` if the offer is a valid PSBT, `false` otherwise.
 */
export function validatePSBT({ offer }: IPFSOffer, { location }: IPFSOrder): boolean {
  const psbt = getPsbt(offer);
  if (psbt === undefined) {
    return false;
  }
  validateOrderInput(psbt, location);
  return true;
}

/**
 * Attempt to retrieve a PSBT from the offer string. We try both hex and base64
 * formats as we don't know which one the user will provide.
 *
 * @param offer - Encoded offer transaction.
 *
 * @returns The PSBT or undefined if it could not be parsed.
 */
function getPsbt(offer: string): btc.Psbt | undefined {
  try {
    return btc.Psbt.fromHex(offer);
  } catch (err) {
    // TODO: Add better check in case the error is not about failure to
    //       parse the hex.
    // not a PSBT hex offer
  }
  try {
    return btc.Psbt.fromBase64(offer);
  } catch (err) {
    // TODO: Add better check in case the error is not about failure to
    //       parse the base64.
    // not a PSBT base64 offer
  }
}

// ### ORDER INPUTS

function validateOrderInput(psbt: btc.Psbt, location: string): void {
  const [txid, vout] = parseLocation(location);
  const hasMakerInput = hasOrderInput(psbt, txid, vout);
  if (hasMakerInput === false) {
    throw new OfferValidationFailed("Offer vin does not include the location specified in the order", {
      location,
    });
  }
}

function hasOrderInput(psbt: btc.Psbt, txid: string, vout: number): boolean {
  for (const input of psbt.data.inputs) {
    if (input.nonWitnessUtxo) {
      const tx = btc.Transaction.fromBuffer(input.nonWitnessUtxo);
      if (tx.getId() === txid && tx.outs.findIndex((_, index) => index === vout) !== -1) {
        return true;
      }
    }
  }
  return false;
}
