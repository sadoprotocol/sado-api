import * as btc from "bitcoinjs-lib";
import Schema, { number, string } from "computed-types";

import { BadRequestError } from "../../Libraries/JsonRpc";
import { method } from "../../Libraries/JsonRpc/Method";
import { Wallet } from "../../Libraries/Wallet";
import { Lookup } from "../../Services/Lookup";
import { utils } from "../../Utilities";
import type { Address } from "../../Utilities/Bitcoin";
import { validate } from "../../Validators";

export const createPartialTransaction = method({
  params: Schema({
    network: validate.schema.network,
    sender: string,
    receiver: string,
    amount: number,
    feeRate: number,
    taproot: Schema({
      pubkey: string,
    }).optional(),
  }),
  handler: async (params) => {
    const [sender, receiver] = getAddresses(params.sender, params.receiver);

    const lookup = new Lookup(params.network);
    const network = utils.bitcoin.getBitcoinNetwork(params.network);
    const amount = params.amount;
    const utxos = await lookup.getUnspents(sender.address);
    const psbt = new btc.Psbt({ network });

    utxos.sort((a, b) => a.sats - b.sats);

    let total = 0;
    let signer: btc.Signer;
    if (params.taproot !== undefined) {
      const res = utils.taproot.addPsbtInputs(new Wallet(params.taproot.pubkey, params.network), psbt, amount, utxos);
      total = res.total;
      signer = res.signer;
    } else {
      total = utils.transaction.addPsbtInputs(psbt, amount, params.sender, utxos, network);
    }

    psbt.addOutput({
      address: receiver.address,
      value: amount,
    });

    const change = total - amount - utils.psbt.getEstimatedFee(psbt, params.feeRate);
    if (change <= 0) {
      throw new BadRequestError("Not enough funds to cover fee");
    }

    psbt.addOutput({
      address: sender.address,
      value: change,
    });

    if (params.taproot !== undefined) {
      return psbt.signAllInputs(signer!).finalizeAllInputs().extractTransaction().toHex();
    }
    return psbt.toBase64();
  },
});

function getAddresses(senderAddress: string, receiverAddress: string): [Address, Address] {
  const sender = utils.bitcoin.getBitcoinAddress(senderAddress);
  if (sender === undefined) {
    throw new Error("Invalid sender address");
  }

  const receiver = utils.bitcoin.getBitcoinAddress(receiverAddress);
  if (receiver === undefined) {
    throw new Error("Invalid receiver address");
  }

  return [sender, receiver];
}
