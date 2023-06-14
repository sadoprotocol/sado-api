import Schema, { array, number, string, unknown } from "computed-types";

import { BadRequestError, NotFoundError } from "../../Libraries/JsonRpc";
import { method } from "../../Libraries/JsonRpc/Method";
import { ipfs } from "../../Services/IPFS";
import { Lookup } from "../../Services/Lookup";
import { utils } from "../../Utilities";
import { OrderPayload } from "../../Utilities/Order/OrderPayload";
import { validate } from "../../Validators";

export const createOrder = method({
  params: Schema({
    network: validate.schema.network,
    order: Schema({
      type: validate.schema.type,
      ts: number,
      location: validate.schema.location,
      cardinals: number,
      maker: string,
      expiry: number.optional(),
      satoshi: number.optional(),
      meta: unknown.object().optional(),
      orderbooks: array.of(string).optional(),
    }),
    signature: Schema({
      value: string,
      format: string.optional(),
      pubkey: string.optional(),
      desc: string.optional(),
    }),
    fees: Schema({
      network: number,
      rate: number,
    }),
  }),
  handler: async (params) => {
    const lookup = new Lookup(params.network);
    const network = utils.bitcoin.getBitcoinNetwork(params.network);

    // ### Maker
    // Get maker details from the bitcoin address.

    const maker = utils.bitcoin.getBitcoinAddress(params.order.maker);
    if (maker === undefined) {
      throw new BadRequestError("Maker validation failed");
    }

    // ### Validate Location
    // Ensure that the UTXO being spent exists and is confirmed.

    await validateLocation(params.order.location, lookup);

    // ### Validate Signature
    // Make sure that the order is verifiable by the API when it is received.

    if (params.signature.format === "psbt") {
      validate.order.psbt(params.signature.value, params.order.location);
    } else {
      validate.order.message(utils.order.toHex(params.order), maker.address, params.signature.value);
    }

    // ### Store Order

    const { cid } = await ipfs.uploadJson(toOrderData(params.order, params.signature));

    // ### Create PSBT
    // Create a PSBT that relays the order to the network. This stores the order
    // reference on the blockchain and can be processed by the API.

    const psbt = await utils.order.create(cid, params.order, network, params.fees, lookup);

    return { cid, psbt: psbt.toBase64() };
  },
});

function toOrderData(
  orderData: OrderPayload,
  signatureData: SignaturePayload
): OrderPayload &
  Omit<SignaturePayload, "value"> & {
    signature: string;
  } {
  return {
    ...orderData,
    signature: signatureData.value,
    format: signatureData.format,
    pubkey: signatureData.pubkey,
    desc: signatureData.desc,
  };
}

async function validateLocation(location: string, lookup: Lookup): Promise<void> {
  const [txid, index] = utils.parse.location(location);
  const transaction = await lookup.getTransaction(txid);
  if (transaction === undefined) {
    throw new NotFoundError("Location transaction does not exist, or is not yet confirmed");
  }
  const vout = transaction.vout[index];
  if (vout === undefined) {
    throw new NotFoundError("Location transaction output does not exist");
  }
}

type SignaturePayload = {
  value: string;
  format?: string;
  pubkey?: string;
  desc?: string;
};
