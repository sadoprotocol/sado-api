import { payments, Psbt, script } from "bitcoinjs-lib";
import Schema, { number, string } from "computed-types";
import varuint from "varuint-bitcoin";

import { method } from "../../Libraries/JsonRpc";
import { utils } from "../../Utilities";
import { validate } from "../../Validators";

export const redeemInscription = method({
  params: Schema({
    network: validate.schema.network,
    input: Schema({
      hash: string,
      index: number,
      value: number,
      output: string,
      script: string,
    }),
    output: Schema({
      address: string,
      value: number,
    }),
  }),
  handler: async ({ input, output, ...params }) => {
    const psbt = new Psbt({ network: utils.bitcoin.getBitcoinNetwork(params.network) });

    psbt.addInput({
      hash: input.hash,
      index: input.index,
      witnessUtxo: {
        script: Buffer.from(input.output, "hex"),
        value: input.value,
      },
      witnessScript: Buffer.from(input.script, "hex"),
    });

    psbt.addOutput({
      address: output.address,
      value: output.value,
    });

    psbt.finalizeInput(0, finalizeInput);

    return psbt.extractTransaction().toHex();
  },
});

function finalizeInput(_: number, input: any) {
  const redeemPayment = payments.p2wsh({
    redeem: {
      input: script.compile([script.number.encode(2), script.number.encode(3)]),
      output: input.witnessScript,
    },
  });

  const finalScriptWitness = witnessStackToScriptWitness(redeemPayment.witness ?? []);

  return {
    finalScriptSig: Buffer.from(""),
    finalScriptWitness,
  };
}

export function witnessStackToScriptWitness(witness: Buffer[]) {
  let buffer = Buffer.allocUnsafe(0);

  function writeSlice(slice: Buffer) {
    buffer = Buffer.concat([buffer, Buffer.from(slice)]);
  }

  function writeVarInt(i: number) {
    const currentLen = buffer.length;
    const varintLen = varuint.encodingLength(i);

    buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)]);
    varuint.encode(i, buffer, currentLen);
  }

  function writeVarSlice(slice: Buffer) {
    writeVarInt(slice.length);
    writeSlice(slice);
  }

  function writeVector(vector: Buffer[]) {
    writeVarInt(vector.length);
    vector.forEach(writeVarSlice);
  }

  writeVector(witness);

  return buffer;
}
