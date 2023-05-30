import * as btc from "bitcoinjs-lib";
import * as btcm from "bitcoinjs-message";
import Schema, { number, string, unknown } from "computed-types";

import { BadRequestError, NotFoundError } from "../../JsonRpc";
import { method } from "../../JsonRpc/Method";
import { parseLocation } from "../../Libraries/Transaction";
import { Lookup } from "../../Services/Lookup";
import { Address, getAddressFromPubKey, getBitcoinAddress, getBitcoinNetwork } from "../../Utilities/Bitcoin";
import { validator } from "../Validator";

export const createSellOrder = method({
  params: Schema({
    network: validator.network,
    order: Schema({
      type: validator.ipfs.type,
      ts: number,
      location: validator.ipfs.location,
      cardinals: number.optional(),
      maker: string,
      expiry: number.optional(),
      satoshi: number.optional(),
      meta: unknown.object().optional(),
    }),
    signature: Schema({
      value: string,
      format: string.optional(),
      pubkey: string.optional(),
      desc: string.optional(),
    }),
  }),
  handler: async (params) => {
    const lookup = new Lookup(params.network);

    const maker = getBitcoinAddress(params.order.maker);
    if (maker === undefined) {
      throw new BadRequestError("Maker validation failed");
    }

    if (params.signature.format === "psbt") {
      validatePSBTSignature(params.signature.value, maker, getBitcoinNetwork(params.network));
    } else {
      validateMessageSignature(getMessageFromOrder(params.order), maker, params.signature.value);
    }

    validateLocation(params.order.location, lookup);

    return "cid-demo-123";
  },
});

function getMessageFromOrder(order: any): string {
  return Buffer.from(
    JSON.stringify({
      type: order.type,
      ts: order.ts,
      location: order.location,
      cardinals: order.cardinals,
      maker: order.maker,
      expiry: order.expiry,
      satoshi: order.satoshi,
      meta: order.meta,
    })
  ).toString("hex");
}

function validatePSBTSignature(signature: string, { address, type }: Address, network: btc.Network): void {
  const psbt = btc.Psbt.fromBase64(signature);

  const input = psbt.data.inputs[0];
  if (input === undefined || input.finalScriptWitness === undefined) {
    throw new BadRequestError("PSBT is not finalized");
  }

  const publicKey = getPubKeyFromFinalScriptWitness(input.finalScriptWitness.toString("hex"));
  if (publicKey === undefined) {
    throw new BadRequestError("Could not extract public key from signature");
  }

  const signerAddress = getAddressFromPubKey(publicKey, type, network);
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

async function validateLocation(location: string, lookup: Lookup): Promise<void> {
  const [txid, index] = parseLocation(location);
  const transaction = await lookup.getTransaction(txid);
  if (transaction === undefined) {
    throw new NotFoundError("Location transaction does not exist, or is not yet confirmed");
  }
  const vout = transaction.vout[index];
  if (vout === undefined) {
    throw new NotFoundError("Location transaction output does not exist");
  }
}

function getPubKeyFromFinalScriptWitness(hex: string): string {
  const signatureLength = parseInt(hex.slice(2, 4), 16) * 2 + 6;
  const publicKeyLength = parseInt(hex.slice(signatureLength + 2, signatureLength + 4), 16) * 2 + 2;
  return hex.slice(signatureLength, signatureLength + publicKeyLength);
}
