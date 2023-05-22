import * as btc from "bitcoinjs-lib";

import { IPFSOffer, IPFSOrder } from "../../../Entities/IPFS";
import { Order } from "../../../Entities/Order";
import { parseLocation } from "../../../Libraries/Transaction";
import { Lookup } from "../../../Services/Lookup";
import { OfferValidationFailed } from "../../Exceptions/OfferException";
import { OrderClosed } from "../../Exceptions/OrderException";
import { utils } from "../../Utilities";

export const offer = {
  validate,
};

async function validate(offer: IPFSOffer, order: IPFSOrder, lookup: Lookup): Promise<void> {
  await hasValidOrder(order.cid);
  await hasValidOffer(offer, order, lookup);
}

async function hasValidOrder(cid: string): Promise<void> {
  const order = await Order.getByCID(cid);
  if (order && order.status === "rejected") {
    throw new OrderClosed();
  }
}

async function hasValidOffer({ offer }: IPFSOffer, order: IPFSOrder, lookup: Lookup): Promise<void> {
  const psbt = utils.psbt.decode(offer);
  if (psbt !== undefined) {
    await validateMakerInput(psbt, order.location);
    await validateTransactionInputs(psbt, lookup);
    return;
  }
  const raw = validateRawTx(offer);
  if (raw === false) {
    throw new OfferValidationFailed("Unable to verify offer validity", { offer });
  }
}

async function validateMakerInput(psbt: btc.Psbt, location: string): Promise<void> {
  const [txid, index] = parseLocation(location);
  const vinIndex = hasOrderInput(psbt, txid, index);
  if (vinIndex === false) {
    throw new OfferValidationFailed("Offer vin does not include the location specified in the order", {
      location,
    });
  }
  if (vinIndex !== 0) {
    throw new OfferValidationFailed("Offer location is not the first vin of the transaction", { location });
  }
}

async function validateTransactionInputs(psbt: btc.Psbt, lookup: Lookup): Promise<void> {
  for (const input of psbt.txInputs) {
    const txid = input.hash.reverse().toString("hex");
    const index = input.index;
    const tx = await lookup.getTransaction(txid);
    if (tx === undefined) {
      throw new OfferValidationFailed("Unable to find transaction", { txid });
    }
    const vout = tx.vout[input.index];
    if (vout === undefined) {
      throw new OfferValidationFailed("Unable to find vout", { txid, index });
    }
    if (vout.spent !== false) {
      throw new OfferValidationFailed("One or more spent inputs", { txid, index });
    }
  }
}

function hasOrderInput(psbt: btc.Psbt, txid: string, vout: number): number | false {
  for (const input of psbt.data.inputs) {
    if (input.nonWitnessUtxo) {
      const tx = btc.Transaction.fromBuffer(input.nonWitnessUtxo);
      const index = tx.outs.findIndex((_, index) => index === vout);
      if (tx.getId() === txid && index !== -1) {
        return index;
      }
    }
  }
  return false;
}

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
 * @param offer - Encoded raw transaction hex.
 *
 * @returns `true` if a signature exists in the inputs of the transaction.
 */
export function validateRawTx(offer: string): boolean {
  const tx = utils.raw.decode(offer);
  if (tx === undefined) {
    throw new OfferValidationFailed("Unable to verify offer validity", { offer });
  }
  for (const input of tx.ins) {
    if (input.script.toString()) {
      return true;
    }
  }
  return false;
}
