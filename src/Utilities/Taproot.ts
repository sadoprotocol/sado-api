import BIP32Factory, { BIP32Interface } from "bip32";
import * as bip39 from "bip39";
import * as btc from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

import { BadRequestError } from "../Libraries/JsonRpc";
import { Network } from "../Libraries/Network";
import { Wallet } from "../Libraries/Wallet";
import { Unspent } from "../Services/Lookup";
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
  getAccountKey,
  getWallet,
  addPsbtInputs,
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
function getAccountKey(masterNode: BIP32Interface, account: number): string {
  return masterNode.deriveHardened(84).deriveHardened(0).derive(account).toBase58();
}

/**
 * Get wallet instance from derived account key.
 *
 * @param key     - Account key to derive wallet from.
 * @param network - Bitcoin network the master node belongs to.
 *
 * @returns wallet instance.
 */
function getWallet(key: string, network: Network): Wallet {
  return new Wallet(key, network);
}

/**
 * Add inputs to a PSBT until the amount is reached using taproot wallet.
 *
 * @param wallet - Wallet to use for signing.
 * @param psbt   - PSBT to add inputs to.
 * @param amount - Amount to fulfill in satoshis.
 * @param utxos  - UTXOs to use for inputs.
 *
 * @returns total amount of inputs in satoshis and signer to use for signing.
 */
function addPsbtInputs(
  wallet: Wallet,
  psbt: btc.Psbt,
  amount: number,
  utxos: Unspent[]
): {
  total: number;
  signer: btc.Signer;
} {
  const [output, pubkey, signer] = wallet.getPaymentDetails(0, "receiving");
  if (output === undefined) {
    throw new BadRequestError("Failed to derive output script");
  }
  let total = 0;
  for (const utxo of utxos) {
    const { txid, n, value } = utxo;
    const sats = bitcoin.btcToSat(value);
    psbt.addInput({
      hash: txid,
      index: n,
      witnessUtxo: {
        script: output,
        value: sats,
      },
      tapInternalKey: pubkey,
    });
    total += sats;
    if (total >= amount) {
      return {
        total,
        signer,
      };
    }
  }
  throw new BadRequestError("Spending address does not have enough funds");
}
