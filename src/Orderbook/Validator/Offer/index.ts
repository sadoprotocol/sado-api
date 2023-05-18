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
  if (psbt === undefined) {
    return validateRawTx(offer);
  }
  await validateMakerInput(psbt, order.location);
  await validateTransactionInputs(psbt, lookup);
}

async function validateMakerInput(psbt: btc.Psbt, location: string): Promise<void> {
  const [txid, index] = parseLocation(location);
  const hasMakerInput = hasOrderInput(psbt, txid, index);
  if (hasMakerInput === false) {
    throw new OfferValidationFailed("Offer vin does not include the location specified in the order", {
      location,
    });
  }
}

async function validateTransactionInputs(psbt: btc.Psbt, lookup: Lookup): Promise<void> {
  for (const input of psbt.txInputs) {
    const txid = input.hash.reverse().toString("hex");
    const index = input.index;
    const tx = await lookup.getPrunedTransaction(txid);
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
export function validateRawTx(offer: string): undefined {
  try {
    const tx = btc.Transaction.fromHex(offer);
    for (const input of tx.ins) {
      if (input.script.toString()) {
        return;
      }
    }
  } catch (error) {
    throw new OfferValidationFailed(error.message, { offer });
  }
  throw new OfferValidationFailed("Unable to verify offer validity", { offer });
}
