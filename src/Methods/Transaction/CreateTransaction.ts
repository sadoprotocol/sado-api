import * as btc from "bitcoinjs-lib";
import Schema, { number, string } from "computed-types";

import { method } from "../../JsonRpc/Method";
import { Lookup } from "../../Services/Lookup";
import { Address, getBitcoinAddress, getBitcoinNetwork } from "../../Utilities/Bitcoin";
import { validator } from "../Validator";

export const createPartialTransaction = method({
  params: Schema({
    network: validator.network,
    senderAddress: string,
    receiverAddress: string,
    amount: number,
    fee: number,
  }),
  handler: async (params) => {
    const [sender, receive] = getAddresses(params.senderAddress, params.receiverAddress);

    const lookup = new Lookup(params.network);
    const utxos = await lookup.getUnspents(sender.address);
    const psbt = new btc.Psbt({ network: getBitcoinNetwork(params.network) });

    utxos.sort((a, b) => a.sats - b.sats);

    console.log(utxos);

    let total = 0;

    for (const utxo of utxos) {
      const { txid, n, sats } = utxo;

      psbt.addInput({
        hash: txid,
        index: n,
        witnessUtxo: {
          script: btc.address.toOutputScript(sender.address, getBitcoinNetwork(params.network)),
          value: sats,
        },
      });

      total += sats;

      if (total >= params.amount - params.fee) {
        break;
      }
    }

    const change = total - params.amount - params.fee;

    psbt.addOutput({
      address: receive.address,
      value: params.amount,
    });

    if (change > 0) {
      psbt.addOutput({
        address: sender.address,
        value: change,
      });
    }

    return psbt.toBase64();
  },
});

function getAddresses(senderAddress: string, receiverAddress: string): [Address, Address] {
  const sender = getBitcoinAddress(senderAddress);
  if (sender === undefined) {
    throw new Error("Invalid sender address");
  }

  const receiver = getBitcoinAddress(receiverAddress);
  if (receiver === undefined) {
    throw new Error("Invalid receiver address");
  }

  return [sender, receiver];
}
