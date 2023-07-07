import BIP32Factory, { BIP32Interface } from "bip32";
import * as bip39 from "bip39";
import * as btc from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

import { Network } from "../Libraries/Network";
import { bitcoin } from "./Bitcoin";

const bip32 = BIP32Factory(ecc);

btc.initEccLib(ecc);

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

export const taproot = {
  generateMnemonic,
  getMasterNode,
  getBip84Account,
  getPaymentOutput,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

/**
 * Generate a mnemonic phrase used to build or recover a wallet master node.
 *
 * @returns mnemonic phrase.
 */
async function generateMnemonic(): Promise<string> {
  return bip39.generateMnemonic();
}

/**
 * Generate a master node from a mnemonic phrase and related network.
 *
 * @param mnemonic - Mnemonic phrase to generate master node from.
 * @param network  - Bitcoin network to generate master node for.
 *
 * @returns master node.
 */
function getMasterNode(mnemonic: string, network: Network): BIP32Interface {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  return bip32.fromSeed(seed, bitcoin.getBitcoinNetwork(network));
}

/**
 * Retrieve a extended public key for a specific account.
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
 *
 * @param masterNode - Master node to derive account key from.
 * @param network    - Network determining the account coin type. (mainnet or testnet)
 * @param account    - Account number to derive key for.
 *
 * @returns extended public key for the account
 */
function getBip84Account(masterNode: BIP32Interface, network: Network, account: number): BIP32Interface {
  return masterNode
    .deriveHardened(84)
    .deriveHardened(network === "mainnet" ? 0 : 1)
    .derive(account);
}

/**
 * Get a taproot script output for a specific internal public key.
 *
 * @param internalPubkey - Internal public key to generate output for.
 * @param network        - Network to generate output for.
 *
 * @returns taproot script output.
 */
function getPaymentOutput(internalPubkey: Buffer, network: btc.Network): Buffer {
  const { output } = btc.payments.p2tr({ internalPubkey, network });
  if (output === undefined) {
    throw new Error("Failed to generate output");
  }
  return output;
}
