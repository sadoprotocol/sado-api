import { PsbtTxInput, Transaction } from "bitcoinjs-lib";
import * as btcm from "bitcoinjs-message";

import { BadRequestError } from "../Libraries/JsonRpc";
import { utils } from "../Utilities";
import type { PsbtInput } from "../Utilities/PSBT";

export const order = {
  psbt: validatePSBTSignature,
  message: validateMessageSignature,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

/**
 * Checks to see if all the inputs on a PSBT are signed.
 *
 * This is a very weak signature verification pattern that only checks to see if inputs
 * have been signed. It does not do any deeper verification than this as PSBT
 *
 * @param signature - Encoded PSBT to validate.
 */
function validatePSBTSignature(signature: string, location: string): void {
  const psbt = utils.psbt.decode(signature);
  if (psbt === undefined) {
    throw new BadRequestError("Could not decode PSBT");
  }
  const input = psbt.data.inputs[0];
  if (input === undefined || isSigned(input) === false) {
    throw new BadRequestError("PSBT is not finalized");
  }
  if (location !== getLocation(input, psbt.txInputs[0])) {
    throw new BadRequestError("PSBT signature does not match order location");
  }
}

/**
 * Verify that a message was signed by the provided address.
 *
 * @param message   - Message to verify.
 * @param address   - Address that signed the message.
 * @param signature - Signature to verify.
 */
function validateMessageSignature(message: string, address: string, signature: string): void {
  if (btcm.verify(message, address, signature) === false) {
    throw new BadRequestError("Message signature is invalid");
  }
}

/*
 |--------------------------------------------------------------------------------
 | Helpers
 |--------------------------------------------------------------------------------
 */

function isSigned(input: PsbtInput): boolean {
  return input.finalScriptWitness !== undefined || input.finalScriptSig !== undefined;
}

function getLocation(input: PsbtInput, txInput: PsbtTxInput): string | undefined {
  const { nonWitnessUtxo } = input;
  if (nonWitnessUtxo === undefined) {
    return undefined;
  }
  const transaction = Transaction.fromBuffer(nonWitnessUtxo);
  const actualTxId = transaction.getId();
  const expectTxId = txInput.hash.reverse().toString("hex");
  if (actualTxId !== expectTxId) {
    return undefined;
  }
  return `${expectTxId}:${txInput.index}`;
}
