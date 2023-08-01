import Schema, { array, number, string, Type, unknown } from "computed-types";

import { validate } from "../../Validators";

export const orderSchema = Schema({
  type: validate.schema.type,
  ts: number,
  location: validate.schema.location,
  cardinals: number,
  maker: string,
  instant: string.optional(),
  expiry: number.optional(),
  satoshi: number.optional(),
  meta: unknown.record(string, unknown).optional(),
  orderbooks: array.of(string).optional(),
});

export function toHex(order: OrderPayload): string {
  const data = { ...order };
  delete data.instant;
  return Buffer.from(JSON.stringify(data)).toString("hex");
}

export type OrderPayload = Type<typeof orderSchema>;

export type OrderType = "buy" | "sell";
