import Schema, { array, number, string, Type, unknown } from "computed-types";

import { validate } from "../../../Validators";

export const params = Schema({
  network: validate.schema.network,
  order: Schema({
    type: validate.schema.type,
    ts: number,
    location: validate.schema.location,
    cardinals: number,
    maker: string,
    expiry: number.optional(),
    satoshi: number.optional(),
    meta: unknown.record(string, unknown).optional(),
    orderbooks: array.of(string).optional(),
  }),
  signature: Schema({
    value: string,
    format: string.optional(),
    desc: string.optional(),
    pubkey: string.optional(),
  }),
  satsPerByte: number,
});

export type Params = Type<typeof params>;
