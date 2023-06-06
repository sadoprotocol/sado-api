import * as btc from "bitcoinjs-lib";

import { Lookup } from "../Services/Lookup";
import { bitcoin } from "./Bitcoin";

export const psbt = {
  decode,
  getFee,
  getEstimatedFee,
};

/**
 * Attempt to retrieve a PSBT from the psbt string. We try both hex and base64
 * formats as we don't know which one the user will provide.
 *
 * @param psbt - Encoded psbt.
 *
 * @returns The PSBT or undefined if it could not be parsed.
 */
function decode(psbt: string): btc.Psbt | undefined {
  try {
    return btc.Psbt.fromHex(psbt);
  } catch (err) {
    // TODO: Add better check in case the error is not about failure to
    //       parse the hex.
    // not a PSBT hex offer
  }
  try {
    return btc.Psbt.fromBase64(psbt);
  } catch (err) {
    // TODO: Add better check in case the error is not about failure to
    //       parse the base64.
    // not a PSBT base64 offer
  }
}

/**
 * Make sure to add a higher fee rate if the blockchain is congested.
 *
 * @param psbt    - Psbt to estimate fee for.
 * @param feeRate - Fee rate in satoshis per byte. Default: 10
 *
 * @returns Estimated fee in satoshis.
 */
function getEstimatedFee(psbt: btc.Psbt, feeRate = 10): number {
  let base = 0;
  let virtual = 0;

  for (const input of psbt.data.inputs) {
    if (input.witnessUtxo !== undefined) {
      base += 180;
    } else {
      base += 41;
      virtual += 108;
    }
  }

  base += 34 * psbt.txOutputs.length + 34; // outputs are the same size no matter segwit or not, include the change output
  base += 10; // 10 extra bytes for version, locktime, etc.
  virtual += Math.ceil((base + virtual) / 4); // virtual size is base for non-segwit data plus 1/4 of segwit data

  return virtual * feeRate;
}

/**
 * Calculate the fee for given PSBT by looking up the input transactions and
 * subtracting the output values.
 *
 * @param psbt   - The PSBT to calculate the fee for.
 * @param lookup - The lookup service to use to retrieve the input transactions.
 *
 * @returns The fee in satoshis.
 */
async function getFee(psbt: btc.Psbt, lookup: Lookup): Promise<number> {
  let inputSum = 0;
  for (const input of psbt.txInputs) {
    const hash = input.hash.reverse().toString("hex");
    const tx = await lookup.getTransaction(hash);
    if (tx !== undefined) {
      inputSum += bitcoin.btcToSat(tx.vout[input.index].value);
    }
  }

  let outputSum = 0;
  for (const output of psbt.txOutputs) {
    outputSum += output.value;
  }

  return inputSum - outputSum;
}

export type PsbtInput = btc.Psbt["data"]["inputs"][number];
