import { BIP32Factory, BIP32Interface } from "bip32";
import * as btc from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

import { utils } from "../Utilities";
import { Network } from "./Network";

const bip32 = BIP32Factory(ecc);

export class Wallet {
  #node: BIP32Interface;
  #network: btc.Network;

  private constructor(node: BIP32Interface, network: btc.Network) {
    this.#node = node;
    this.#network = network;
  }

  /*
   |--------------------------------------------------------------------------------
   | Factories
   |--------------------------------------------------------------------------------
   */

  static fromBase58(key: string, network: Network): Wallet {
    const net = utils.bitcoin.getBitcoinNetwork(network);
    return new Wallet(bip32.fromBase58(key, net), net);
  }

  static fromPrivateKey(key: string, network: Network): Wallet {
    const net = utils.bitcoin.getBitcoinNetwork(network);
    return new Wallet(bip32.fromPrivateKey(Buffer.from(key, "hex"), Buffer.alloc(32), net), net);
  }

  static fromPublicKey(key: string, network: Network): Wallet {
    const net = utils.bitcoin.getBitcoinNetwork(network);
    return new Wallet(bip32.fromPublicKey(Buffer.from(key, "hex"), Buffer.alloc(32), net), net);
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get node(): BIP32Interface {
    return this.#node;
  }

  get signer(): btc.Signer {
    return this.#node.tweak(btc.crypto.taggedHash("TapTweak", this.internalPubkey));
  }

  get output(): Buffer {
    const { output } = btc.payments.p2tr({
      internalPubkey: this.internalPubkey,
      network: this.#network,
    });
    if (output === undefined) {
      throw new Error("Failed to generate output");
    }
    return output;
  }

  get address(): string | undefined {
    const { address } = btc.payments.p2tr({
      internalPubkey: this.internalPubkey,
      network: this.#network,
    });
    return address;
  }

  get privateKey(): Buffer | undefined {
    return this.#node.privateKey;
  }

  get internalPubkey(): Buffer {
    return this.publicKey.slice(1);
  }

  get publicKey(): Buffer {
    return this.#node.publicKey;
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  derive(path: string): Wallet {
    return new Wallet(this.#node.derivePath(path), this.#network);
  }
}
