import * as btc from "bitcoinjs-lib";

import { parseLocation } from "../../../../Libraries/Transaction";
import { IPFSOffer, IPFSOrder } from "../../../../Services/Infura";
import { OfferValidationFailed } from "../../../Exceptions/OfferException";

export function validatePSBT({ offer }: IPFSOffer, { location }: IPFSOrder): boolean {
  const psbt = getPsbt(offer);
  if (psbt === undefined) {
    return false;
  }
  validateOrderInput(psbt, location);
  return true;
}

function getPsbt(offer: string): btc.Psbt | undefined {
  try {
    return btc.Psbt.fromHex(offer);
  } catch (err) {}
  try {
    return btc.Psbt.fromBase64(offer);
  } catch (err) {}
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
