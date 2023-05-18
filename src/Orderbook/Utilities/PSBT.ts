import * as btc from "bitcoinjs-lib";

import { btcToSat } from "../../Libraries/Bitcoin";
import { Lookup } from "../../Services/Lookup";

export const psbt = {
  decode,
  getFee,
};

/**
 * Attempt to retrieve a PSBT from the offer string. We try both hex and base64
 * formats as we don't know which one the user will provide.
 *
 * @param offer - Encoded offer transaction.
 *
 * @returns The PSBT or undefined if it could not be parsed.
 */
function decode(offer: string): btc.Psbt | undefined {
  try {
    return btc.Psbt.fromHex(offer);
  } catch (err) {
    // TODO: Add better check in case the error is not about failure to
    //       parse the hex.
    // not a PSBT hex offer
  }
  try {
    return btc.Psbt.fromBase64(offer);
  } catch (err) {
    // TODO: Add better check in case the error is not about failure to
    //       parse the base64.
    // not a PSBT base64 offer
  }
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
      inputSum += btcToSat(tx.vout[input.index].value);
    }
  }

  let outputSum = 0;
  for (const output of psbt.txOutputs) {
    outputSum += output.value;
  }

  return inputSum - outputSum;
}
