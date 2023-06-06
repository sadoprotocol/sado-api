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
 * @param account    - Account number to derive key for.
 *
 * @returns extended public key for the account
 */
function getBip84Account(masterNode: BIP32Interface, account: number): BIP32Interface {
  return masterNode.deriveHardened(84).deriveHardened(0).derive(account);
}
