import Schema, { array, number, string, Type, unknown } from "computed-types";

import { validate } from "../../../Validators";

export const orderSchema = Schema({
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

export const signatureSchema = Schema({
  value: string,
  format: string.optional(),
  desc: string.optional(),
});

export const params = Schema({
  network: validate.schema.network,
  order: orderSchema,
  signature: signatureSchema,
  pubkey: string.optional(),
  fees: Schema({
    network: number,
    rate: number,
  }),
});

export type OrderSchema = Type<typeof orderSchema>;

export type SignatureSchema = Type<typeof signatureSchema>;

export type Params = Type<typeof params>;
