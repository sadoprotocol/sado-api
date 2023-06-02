import BIP32Factory from "bip32";
import * as bip39 from "bip39";
import * as btc from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import * as wif from "wif";

import { BadRequestError } from "../Libraries/JsonRpc";
import { Network } from "../Libraries/Network";
import { Unspent } from "../Services/Lookup";
import { bitcoin } from "./Bitcoin";

const path = "m/84'/0'/0'/0/0"; // Path to first child of receiving wallet on first account
const bip32 = BIP32Factory(ecc);

btc.initEccLib(ecc);

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

export const taproot = {
  getNewAddress,
  getAddressFromMnemonic,
  addPsbtInputs,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function getNewAddress(network: Network): Promise<Taproot> {
  return getAddressFromMnemonic(await bip39.generateMnemonic(), network);
}

async function getAddressFromMnemonic(mnemonic: string, network: Network): Promise<Taproot> {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed);

  const chainCode = root.chainCode.toString("hex");
  const childNode = root.derivePath(path);

  const privateKey = childNode.privateKey;
  if (privateKey === undefined) {
    throw new Error("Failed to derive private key");
  }

  const publicKey = childNode.publicKey.toString("hex");
  const xOnlyPubKey = childNode.publicKey.slice(1);
  const descriptor = `tr(${xOnlyPubKey.toString("hex")})`;

  const { address } = btc.payments.p2tr({
    internalPubkey: xOnlyPubKey,
    network: bitcoin.getBitcoinNetwork(network),
  });

  if (address === undefined) {
    throw new Error("Failed to drive address");
  }

  return {
    mnemonic,
    seed: seed.toString("hex"),
    address,
    privateKey: privateKey.toString("hex"),
    publicKey,
    chainCode,
    desc: descriptor,
    wifKey: wif.encode(getWifVersion(network), privateKey, true),
    network,
  };
}

function addPsbtInputs(
  psbt: btc.Psbt,
  amount: number,
  utxos: Unspent[],
  taproot: Pick<Taproot, "seed">,
  network: btc.Network
): {
  total: number;
  signer: btc.Signer;
} {
  const root = bip32.fromSeed(Buffer.from(taproot.seed, "hex"));

  const childNode = root.derivePath(path);
  const internalPubkey = childNode.publicKey.slice(1);

  const tweakedChildNode = childNode.tweak(btc.crypto.taggedHash("TapTweak", internalPubkey));

  const { output } = btc.payments.p2tr({
    internalPubkey,
    network,
  });
  if (output === undefined) {
    throw new BadRequestError("Failed to derive output script");
  }

  let total = 0;
  for (const utxo of utxos) {
    const { txid, n, sats } = utxo;

    psbt.addInput({
      hash: txid,
      index: n,
      witnessUtxo: {
        script: output,
        value: sats,
      },
      tapInternalKey: internalPubkey,
    });

    total += sats;

    if (total >= amount) {
      return {
        total,
        signer: tweakedChildNode,
      };
    }
  }

  throw new BadRequestError("Spending address does not have enough funds");
}

/*
 |--------------------------------------------------------------------------------
 | Helpers
 |--------------------------------------------------------------------------------
 */

function getWifVersion(network: Network): number {
  switch (network) {
    case "mainnet": {
      return 0x80;
    }
    case "testnet":
    case "regtest": {
      return 0xef;
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Taproot = {
  mnemonic: string;
  seed: string;
  address: string;
  privateKey: string;
  publicKey: string;
  chainCode: string;
  desc: string;
  wifKey: string;
  network: Network;
};
