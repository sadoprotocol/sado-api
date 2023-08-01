import Schema, { number, string, Type } from "computed-types";

import { orderSchema } from "../../../Utilities/Order/OrderPayload";
import { validate } from "../../../Validators";
import { schema } from "../../../Validators/Schema";

export const params = Schema({
  network: validate.schema.network,
  order: orderSchema,
  signature: Schema({
    value: string,
    format: schema.signature.format,
    desc: string.optional(),
    pubkey: string.optional(),
  }),
  satsPerByte: number,
});

export type Params = Type<typeof params>;
