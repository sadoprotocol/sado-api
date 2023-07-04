import { BIP32Factory, BIP32Interface } from "bip32";
import * as bip39 from "bip39";
import * as btc from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

import { Lookup } from "../Services/Lookup";
import { utils } from "../Utilities";
import { Network } from "./Network";

const bip32 = BIP32Factory(ecc);

export class Wallet {
  #node: BIP32Interface;
  #network: btc.Network;
  #lookup: Lookup;

  private constructor(node: BIP32Interface, network: btc.Network, lookup: Lookup) {
    this.#node = node;
    this.#network = network;
    this.#lookup = lookup;
  }

  /*
   |--------------------------------------------------------------------------------
   | Factories
   |--------------------------------------------------------------------------------
   */

  static fromMnemonic(mnemonic: string, network: Network): Wallet {
    return Wallet.fromSeed(bip39.mnemonicToSeedSync(mnemonic).toString("hex"), network);
  }

  static fromSeed(seed: string, network: Network): Wallet {
    const net = utils.bitcoin.getBitcoinNetwork(network);
    return new Wallet(bip32.fromSeed(Buffer.from(seed, "hex"), net), net, new Lookup(network));
  }

  static fromBase58(key: string, network: Network): Wallet {
    const net = utils.bitcoin.getBitcoinNetwork(network);
    return new Wallet(bip32.fromBase58(key, net), net, new Lookup(network));
  }

  static fromPrivateKey(key: string, network: Network): Wallet {
    const net = utils.bitcoin.getBitcoinNetwork(network);
    return new Wallet(bip32.fromPrivateKey(Buffer.from(key, "hex"), Buffer.alloc(32), net), net, new Lookup(network));
  }

  static fromPublicKey(key: string, network: Network): Wallet {
    const net = utils.bitcoin.getBitcoinNetwork(network);
    return new Wallet(bip32.fromPublicKey(Buffer.from(key, "hex"), Buffer.alloc(32), net), net, new Lookup(network));
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get network(): btc.Network {
    return this.#network;
  }

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

  get address(): string {
    const { address } = btc.payments.p2tr({
      internalPubkey: this.internalPubkey,
      network: this.#network,
    });
    if (address === undefined) {
      throw new Error("Failed to resolve address from loaded wallet");
    }
    return address;
  }

  get privateKey(): Buffer | undefined {
    return this.#node.privateKey;
  }

  get internalPubkey(): Buffer {
    return this.publicKey.slice(1, 33);
  }

  get publicKey(): Buffer {
    return this.#node.publicKey;
  }

  /*
   |--------------------------------------------------------------------------------
   | Network
   |--------------------------------------------------------------------------------
   */

  async getUnspents() {
    return this.#lookup.getUnspents(this.address);
  }

  async relay(psbt: btc.Psbt) {
    return this.#lookup.relay(psbt.signAllInputs(this.#node).finalizeAllInputs().extractTransaction().toHex());
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  receive(index: number): Wallet {
    return this.derive(`0/${index}`);
  }

  change(index: number): Wallet {
    return this.derive(`1/${index}`);
  }

  derive(path: string): Wallet {
    return new Wallet(this.#node.derivePath(path), this.#network, this.#lookup);
  }
}
