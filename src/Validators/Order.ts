import * as btc from "bitcoinjs-lib";
import * as btcm from "bitcoinjs-message";

import { BadRequestError } from "../Libraries/JsonRpc";
import { utils } from "../Utilities";
import type { Address } from "../Utilities/Bitcoin";

export const order = {
  psbt: validatePSBTSignature,
  message: validateMessageSignature,
};

function validatePSBTSignature(signature: string, { address, type }: Address, network: btc.Network): void {
  const psbt = btc.Psbt.fromBase64(signature);

  const input = psbt.data.inputs[0];
  if (input === undefined || input.finalScriptWitness === undefined) {
    throw new BadRequestError("PSBT is not finalized");
  }

  const publicKey = utils.input.getPubKeyFromFinalScriptWitness(input.finalScriptWitness.toString("hex"));
  if (publicKey === undefined) {
    throw new BadRequestError("Could not extract public key from signature");
  }

  const signerAddress = utils.bitcoin.getAddressFromPubKey(publicKey, type, network);
  if (signerAddress !== address) {
    throw new BadRequestError("Public key does not belong to maker address");
  }
}

function validateMessageSignature(message: string, { address }: Address, signature: string): void {
  if (btcm.verify(message, address, signature) === false) {
    console.log(message);
    throw new BadRequestError("Message signature is invalid");
  }
}
