import * as btc from "bitcoinjs-lib";

import { Ordinal } from "../../Collections/Transaction";
import { BadRequestError } from "../../Libraries/JsonRpc";
import type { Lookup } from "../../Services/Lookup";
import { parse } from "../Parse";
import { psbt as psbtUtils } from "../PSBT";
import { OrderPayload } from "./OrderPayload";

export async function createOrderPsbt(
  cid: string,
  order: OrderPayload,
  network: btc.Network,
  fees: { network: number; rate: number },
  lookup: Lookup
) {
  const psbt = new btc.Psbt({ network });

  const utxos = await getSpendableUtxo(order.maker, lookup);
  if (utxos.length < 0) {
    throw new BadRequestError("No spendable UTXOs found on maker address", {
      details: "You need to have at least one spendable UTXO that does not contain any rare ordinals or inscriptions.",
    });
  }

  // ### Outputs

  let amount = 0;

  for (const orderbook of order.orderbooks ?? []) {
    const [address, value] = parse.orderbookListing(orderbook);
    amount += value;
    psbt.addOutput({ address, value });
  }

  psbt.addOutput({
    script: btc.payments.embed({ data: [Buffer.from(`sado=order:${cid}`, "utf8")] }).output!,
    value: 0,
  });

  // ### Inputs

  let total = 0;

  for (const utxo of utxos) {
    const { txid, n, sats } = utxo;

    psbt.addInput({
      hash: txid,
      index: n,
      witnessUtxo: {
        script: btc.address.toOutputScript(order.maker, network),
        value: sats,
      },
    });

    total += sats;

    if (total >= amount) {
      break;
    }
  }

  // ### Fee & Change

  const fee = psbtUtils.getEstimatedFee(psbt, fees.rate) + fees.network;
  const change = total - fee;
  if (change <= 0) {
    throw new BadRequestError("Not enough funds to cover fee");
  }

  psbt.addOutput({
    address: order.maker,
    value: change,
  });

  return psbt;
}

async function getSpendableUtxo(address: string, lookup: Lookup) {
  const unspents = await lookup.getUnspents(address);
  return unspents
    .filter((unspent) => hasSpendableRarity(unspent.ordinals) === true && unspent.inscriptions.length === 0)
    .sort((a, b) => a.sats - b.sats);
}

function hasSpendableRarity(ordinals: Ordinal[]): boolean {
  for (const ordinal of ordinals) {
    if (ordinal.rarity !== "common") {
      return false;
    }
  }
  return true;
}
