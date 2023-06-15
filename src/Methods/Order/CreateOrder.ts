import Schema, { array, number, string, Type, unknown } from "computed-types";

import type { IPFSOrder } from "../../Collections/IPFS";
import { BadRequestError, NotFoundError } from "../../Libraries/JsonRpc";
import { method } from "../../Libraries/JsonRpc/Method";
import { ipfs } from "../../Services/IPFS";
import { Lookup } from "../../Services/Lookup";
import { utils } from "../../Utilities";
import { validate } from "../../Validators";

/*
 |--------------------------------------------------------------------------------
 | Method Params
 |--------------------------------------------------------------------------------
 */

const orderSchema = Schema({
  type: validate.schema.type,
  ts: number,
  location: validate.schema.location,
  cardinals: number,
  maker: string,
  expiry: number.optional(),
  satoshi: number.optional(),
  meta: unknown.record(string, unknown).optional(),
  orderbooks: array.of(string).optional(),
});

const signatureSchema = Schema({
  value: string,
  format: string.optional(),
  desc: string.optional(),
});

type OrderSchema = Type<typeof orderSchema>;
type SignatureSchema = Type<typeof signatureSchema>;

/*
 |--------------------------------------------------------------------------------
 | Create Order Method
 |--------------------------------------------------------------------------------
 */

export const createOrder = method({
  params: Schema({
    network: validate.schema.network,
    order: orderSchema,
    signature: signatureSchema,
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

    const { cid } = await ipfs.uploadJson<OrderData>(getIPFSOrderData(params.order, params.signature));

    // ### Create PSBT
    // Create a PSBT that relays the order to the network. This stores the order
    // reference on the blockchain and can be processed by the API.

    const psbt = await utils.order.create(cid, params.order, network, params.fees, lookup);

    return { cid, psbt: psbt.toBase64() };
  },
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

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

function getIPFSOrderData(data: OrderSchema, signature: SignatureSchema): OrderData {
  return {
    ts: data.ts,
    type: data.type,
    location: data.location,
    cardinals: data.cardinals,
    maker: data.maker,
    expiry: data.expiry,
    satoshi: data.satoshi,
    meta: data.meta,
    signature: signature.value,
    signature_format: signature.format,
    desc: signature.desc,
  };
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type OrderData = Omit<IPFSOrder, "cid">;
