import * as btc from "bitcoinjs-lib";

import type { Transaction, Vout } from "../Collections/Transaction";
import { BadRequestError } from "../Libraries/JsonRpc";
import { Lookup, Unspent } from "../Services/Lookup";
import { bitcoin, BTC_TO_SAT } from "./Bitcoin";

export const transaction = {
  getAddressOutputValue,
  getTransactionVout,
  addPsbtInputs,
};

/**
 * Get total value of all vouts in satoshis that is associated with the provided address.
 *
 * @param tx      - Transaction to extract value from.
 * @param address - Address to get value for.
 *
 * @returns Value of vouts in satoshis or `0` if no value is found.
 */
function getAddressOutputValue(tx: Transaction, address: string): number {
  let value = 0;
  for (const vout of tx.vout) {
    if (vout.scriptPubKey.address === address) {
      value += vout.value;
    }
  }
  if (value > 0) {
    return Math.floor(value * BTC_TO_SAT);
  }
  return value;
}

/**
 * Lookups up a transaction and returns the vout at the provided index.
 *
 * @param txid   - Transaction ID to lookup.
 * @param vout   - Vout index to lookup.
 * @param lookup - Lookup service to use.
 *
 * @returns Vout or `undefined` if not found.
 */
async function getTransactionVout(txid: string, vout: number, lookup: Lookup): Promise<Vout | undefined> {
  const tx = await lookup.getTransaction(txid);
  if (tx === undefined) {
    return undefined;
  }
  return tx.vout[vout];
}

function addPsbtInputs(psbt: btc.Psbt, amount: number, address: string, utxos: Unspent[], network: btc.Network) {
  let total = 0;
  for (const utxo of utxos) {
    const { txid, n, sats } = utxo;
    psbt.addInput({
      hash: txid,
      index: n,
      witnessUtxo: {
        script: btc.address.toOutputScript(address, network),
        value: sats,
      },
    });
    total += sats;
    if (total >= amount) {
      return total;
    }
  }
  throw new BadRequestError("Spending address does not have enough funds");
}
