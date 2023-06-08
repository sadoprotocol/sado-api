import { opcodes, payments, script } from "bitcoinjs-lib";
import Schema, { string } from "computed-types";

import { method } from "../../Libraries/JsonRpc";
import { utils } from "../../Utilities";
import { validate } from "../../Validators";

export const createInscription = method({
  params: Schema({
    network: validate.schema.network,
    pubkey: string,
    inscription: Schema({
      type: string,
      data: string,
    }),
  }),
  handler: async (params) => {
    const network = utils.bitcoin.getBitcoinNetwork(params.network);
    const witness = script.compile([opcodes.OP_ADD, script.number.encode(5), opcodes.OP_EQUAL]);

    const p2wsh = payments.p2wsh({
      redeem: {
        output: witness,
        network,
      },
      network,
    });

    return {
      address: p2wsh.address,
      output: p2wsh.output?.toString("hex"),
      script: witness.toString("hex"),
    };
  },
});
