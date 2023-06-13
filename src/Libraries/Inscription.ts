import { opcodes, payments, script } from "bitcoinjs-lib";

import { Wallet } from "./Wallet";

export class Inscription {
  readonly #wallet: Wallet;

  #envelopes: (number | Buffer)[][] = [];

  constructor(wallet: Wallet) {
    this.#wallet = wallet;
  }

  get address() {
    const { address } = payments.p2tr({
      internalPubkey: this.#wallet.internalPubkey,
      scriptTree: {
        output: this.script,
      },
      network: this.#wallet.network,
    });
    if (address === undefined) {
      throw new Error("Failed to generate inscription address");
    }
    return address;
  }

  get script() {
    return script.compile([
      ...[this.#wallet.internalPubkey, opcodes.OP_CHECKSIG],
      ...this.#envelopes.reduce((envelopes, envelope) => envelopes.concat(envelope), []),
    ]);
  }

  addEnvelope(type: string, data: string) {
    this.#envelopes.push([
      opcodes.OP_FALSE,
      opcodes.OP_IF,
      push("ord"),
      1,
      1,
      push(type),
      opcodes.OP_0,
      push(data),
      opcodes.OP_ENDIF,
    ]);
    return this;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function push(value: string): Buffer {
  return Buffer.concat([Buffer.from(value, "utf8")]);
}
