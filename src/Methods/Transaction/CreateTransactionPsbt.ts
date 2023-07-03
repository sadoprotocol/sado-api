import * as btc from "bitcoinjs-lib";
import Schema, { number, string } from "computed-types";

import { BadRequestError } from "../../Libraries/JsonRpc";
import { method } from "../../Libraries/JsonRpc/Method";
import { Lookup } from "../../Services/Lookup";
import { utils } from "../../Utilities";
import type { Address } from "../../Utilities/Bitcoin";
import { validate } from "../../Validators";

export const createTransactionPsbt = method({
  params: Schema({
    network: validate.schema.network,
    sender: string,
    receiver: string,
    amount: number,
    feeRate: number,
  }),
  handler: async (params) => {
    const network = utils.bitcoin.getBitcoinNetwork(params.network);
    const [sender, receiver] = getAddresses(params.sender, params.receiver);

    const lookup = new Lookup(params.network);
    const psbt = new btc.Psbt({ network });

    let total = 0;

    const utxos = await lookup.getUnspents(sender.address);
    for (const utxo of utxos.sort((a, b) => a.sats - b.sats)) {
      const { txid, n, value } = utxo;
      const sats = utils.bitcoin.btcToSat(value);
      psbt.addInput({
        hash: txid,
        index: n,
        witnessUtxo: {
          script: btc.address.toOutputScript(sender.address, network),
          value: sats,
        },
      });
      total += sats;
      if (total >= params.amount) {
        break;
      }
    }

    psbt.addOutput({
      address: receiver.address,
      value: params.amount,
    });

    const change = total - params.amount - utils.psbt.getEstimatedFee(psbt, params.feeRate);
    if (change <= 0) {
      throw new BadRequestError("Not enough funds to cover fee");
    }

    psbt.addOutput({
      address: sender.address,
      value: change,
    });

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
