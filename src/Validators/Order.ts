import { BadRequestError } from "@valkyr/api";
import { Network } from "bitcoinjs-lib";
import { verify as verifyMessage } from "bitcoinjs-message";

import { utils } from "../Utilities";

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
 * @param location  - Location to be confirmed in the first input of the PSBT.
 * @param network   - Network the PSBT was signed for.
 */
function validatePSBTSignature(signature: string, location: string, network: Network): void {
  const psbt = utils.psbt.decode(signature);
  if (psbt === undefined) {
    throw new BadRequestError("Could not decode PSBT");
  }
  const input = utils.psbt.toJSON(psbt, network).inputs[0];
  if (input === undefined) {
    throw new BadRequestError("PSBT does not contain any inputs");
  }
  if (input.signed === false) {
    throw new BadRequestError("PSBT is not finalized");
  }
  if (location !== input.location) {
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
  if (verifyMessage(message, address, signature) === false) {
    throw new BadRequestError("Message signature is invalid");
  }
}
