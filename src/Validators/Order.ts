import { BadRequestError } from "@valkyr/api";
import { Network } from "bitcoinjs-lib";
import { verify as verifyMessage } from "bitcoinjs-message";

import { utils } from "../Utilities";
import { getAddresses } from "../Utilities/Bip32";

export const order = {
  signature: {
    psbt: validatePSBTSignature,
    ordit: validateOrditSignature,
    core: validateCoreSignature,
  },
} as const;

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
 * Verify that message was signed by the provided public key.
 *
 * @param message   - Message to verify.
 * @param key       - Public key that signed the message.
 * @param signature - Signature to verify.
 * @param network   - Network the signature was signed for.
 */
function validateOrditSignature(message: string, key: string, signature: string, network: Network): void {
  const address = getAddresses(key, network).find((address) => address.format === "legacy");
  if (address === undefined) {
    throw new BadRequestError("Failed to retrieve legacy address from public key");
  }
  validateCoreSignature(message, address.value, Buffer.from(signature, "hex").toString("base64"));
}

/**
 * Verify that a message was signed by the provided address.
 *
 * @param message   - Message to verify.
 * @param address   - Address that signed the message.
 * @param signature - Signature to verify.
 */
function validateCoreSignature(message: string, address: string, signature: string): void {
  if (
    verifyMessage(message, address, signature) === false &&
    fallbackVerification({ message, address, signature }) === false
  ) {
    throw new BadRequestError("Message signature is invalid");
  }
}

function fallbackVerification({ message, address, signature }: any) {
  let isValid = false;
  const flags = [...Array(12).keys()].map((i) => i + 31);
  for (const flag of flags) {
    const flagByte = Buffer.alloc(1);
    flagByte.writeInt8(flag);
    let sigBuffer = Buffer.from(signature, "base64").slice(1);
    sigBuffer = Buffer.concat([flagByte, sigBuffer]);
    const candidateSig = sigBuffer.toString("base64");
    try {
      isValid = verifyMessage(message, address, candidateSig);
      if (isValid) break;
    } catch (_) {
      // ...
    }
  }
  return isValid;
}
