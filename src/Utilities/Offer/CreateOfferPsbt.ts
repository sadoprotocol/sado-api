import { BadRequestError } from "@valkyr/api";
import { address, Network, payments, Psbt } from "bitcoinjs-lib";

import type { Lookup } from "../../Services/Lookup";
import { parse } from "../Parse";
import { psbt as psbtUtils } from "../PSBT";
import { transaction } from "../Transaction";

export async function createOfferPsbt(cid: string, offer: CreateOfferData, lookup: Lookup) {
  const psbt = new Psbt({ network: offer.network });

  const utxos = await transaction.getSpendableUtxos(offer.taker, offer.usedUtxos, lookup);
  if (utxos.length === 0) {
    throw new BadRequestError("No spendable UTXOs found on taker address", {
      details: "You need to have at least one spendable UTXO that does not contain any rare ordinals or inscriptions.",
    });
  }
  // ### Outputs

  let amount = 600; // 600 sats for maker output

  for (const orderbook of offer.orderbooks ?? []) {
    const [address, value] = parse.orderbookListing(orderbook);
    amount += value;
    psbt.addOutput({ address, value });
  }

  psbt.addOutput({
    script: payments.embed({ data: [Buffer.from(`sado=offer:${cid}`, "utf8")] }).output!,
    value: 0,
  });

  psbt.addOutput({
    address: offer.maker,
    value: 600,
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
        script: address.toOutputScript(offer.taker, offer.network),
        value: sats,
      },
    });

    total += sats;
    fee = psbtUtils.getEstimatedFee(psbt, offer.fees.rate) + offer.fees.network;

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
    address: offer.taker,
    value: change,
  });

  return psbt;
}

type CreateOfferData = {
  network: Network;
  maker: string;
  taker: string;
  orderbooks: string[];
  usedUtxos: string[];
  fees: { network: number; rate: number };
};
