import * as btc from "bitcoinjs-lib";

import { IPFSOffer, IPFSOrder } from "../Collections/IPFS";
import { Order } from "../Collections/Order";
import { OfferValidationFailed } from "../Exceptions/OfferException";
import { OrderClosed } from "../Exceptions/OrderException";
import { Lookup } from "../Services/Lookup";
import { utils } from "../Utilities";

export async function offer(offer: IPFSOffer, order: IPFSOrder, lookup: Lookup): Promise<void> {
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
  const [txid, vout] = utils.parse.location(location);
  const [input, index] = getOrderLocationInput(psbt, txid, vout);
  if (input === false) {
    throw new OfferValidationFailed("Order utxo is not present in the offer transaction", {
      location,
    });
  }
  if (index !== 0) {
    throw new OfferValidationFailed("Order utxo is in the wrong transaction input position", {
      location,
      expected: 0,
      actual: index,
    });
  }
  if (input.finalScriptSig !== undefined) {
    throw new OfferValidationFailed("Order utxo was signed by taker", { location });
  }
}

function getOrderLocationInput(
  psbt: btc.Psbt,
  txid: string,
  vout: number
): [btc.Psbt["data"]["inputs"][number], number] | [false, -1] {
  let index = 0;
  for (const input of psbt.data.inputs) {
    if (input.nonWitnessUtxo) {
      const tx = btc.Transaction.fromBuffer(input.nonWitnessUtxo);
      if (tx.getId() === txid && tx.outs.findIndex((_, index) => index === vout) !== -1) {
        return [input, index];
      }
    }
    if (input.witnessUtxo) {
      const inputTxid = psbt.txInputs[index].hash.reverse().toString("hex");
      const inputVout = psbt.txInputs[index].index;
      if (inputTxid === txid && inputVout === vout) {
        return [input, index];
      }
    }
    index += 1;
  }
  return [false, -1];
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
