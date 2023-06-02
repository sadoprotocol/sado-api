import { BIP32Factory, BIP32Interface } from "bip32";
import * as btc from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

import { utils } from "../Utilities";
import { Network } from "./Network";

const bip32 = BIP32Factory(ecc);

const ADDRESS_TYPE = {
  receiving: 0,
  change: 1,
};

export class Wallet {
  #node: BIP32Interface;
  #network: btc.Network;

  constructor(key: string, network: Network) {
    this.#node = bip32.fromBase58(key, utils.bitcoin.getBitcoinNetwork(network));
    this.#network = utils.bitcoin.getBitcoinNetwork(network);
  }

  getPaymentDetails(index: number, type: AddressType): [Buffer | undefined, Buffer, btc.Signer] {
    return [this.getOutput(index, type), this.getPubkey(index, type), this.getSigner(index, type)];
  }

  getSigner(index: number, type: AddressType): btc.Signer {
    return this.#node.tweak(btc.crypto.taggedHash("TapTweak", this.getPubkey(index, type)));
  }

  getOutput(index: number, type: AddressType): Buffer | undefined {
    const { output } = btc.payments.p2tr({
      internalPubkey: this.getPubkey(index, type),
      network: this.#network,
    });
    return output;
  }

  getAddress(index: number, type: AddressType): string | undefined {
    const { address } = btc.payments.p2tr({
      internalPubkey: this.getPubkey(index, type),
      network: this.#network,
    });
    return address;
  }

  getPubkey(index: number, type: AddressType): Buffer {
    return this.#node.derive(ADDRESS_TYPE[type]).derive(index).publicKey.slice(1);
  }

  getWifVersion(): number {
    switch (this.#network) {
      case btc.networks.bitcoin: {
        return 0x80;
      }
      case btc.networks.testnet:
      case btc.networks.regtest: {
        return 0xef;
      }
    }
    throw new Error("Cannot get WIF version for unknown wallet network");
  }
}

type AddressType = "receiving" | "change";
