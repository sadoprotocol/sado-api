import { address, payments, Psbt } from "bitcoinjs-lib";

import { BadRequestError } from "../../../Libraries/JsonRpc";
import { Lookup } from "../../../Services/Lookup";
import { utils } from "../../../Utilities";
import { Params } from "./Params";

export async function createOrderPsbt(cid: string, params: Params, lookup: Lookup): Promise<Psbt> {
  const psbt = new Psbt({ network: lookup.btcnetwork });

  const utxos = await utils.transaction.getSpendableUtxos(params.order.maker, [], lookup);
  if (utxos.length === 0) {
    throw new BadRequestError("No spendable UTXOs found on maker address", {
      details: "You need to have at least one spendable UTXO that does not contain any rare ordinals or inscriptions.",
    });
  }

  // ### Outputs

  let amount = 600; // 600 sats guarantee of change back to the maker

  for (const orderbook of params.order.orderbooks ?? []) {
    const [address, value] = utils.parse.orderbookListing(orderbook);
    amount += value;
    psbt.addOutput({ address, value });
  }

  psbt.addOutput({
    script: payments.embed({ data: [Buffer.from(`sado=order:${cid}`, "utf8")] }).output!,
    value: 0,
  });

  // ### Inputs

  let total = 0;
  let fee = 0;

  for (const utxo of utxos) {
    const { txid, n, sats } = utxo;

    psbt.addInput({
      hash: txid,
      index: n,
      witnessUtxo: {
        script: address.toOutputScript(params.order.maker, lookup.btcnetwork),
        value: sats,
      },
      tapInternalKey: params.signature.pubkey ? Buffer.from(params.signature.pubkey, "hex") : undefined,
    });

    total += sats;
    fee = utils.psbt.getEstimatedFee(psbt, params.fees.rate) + params.fees.network;

    if (total - fee >= amount) {
      break;
    }
  }

  // ### Fee & Change

  const change = total - fee;
  if (change <= 0) {
    throw new BadRequestError("Not enough funds to cover fee");
  }

  psbt.addOutput({
    address: params.order.maker,
    value: change,
  });

  return psbt;
}
