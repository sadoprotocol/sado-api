import fetch, { RequestInit } from "node-fetch";

import { config } from "../config";
import { Network } from "../libraries/network";
import { redis } from "./redis";

export const lookup = {
  transactions,
  transaction,
  balance,
  unspents,
  inscriptions,
};

/*
 |--------------------------------------------------------------------------------
 | Service Methods
 |--------------------------------------------------------------------------------
 */

async function transactions(address: string, network: Network): Promise<Transaction[]> {
  const txs = await get("/transactions", { address }, network);
  if (txs === undefined) {
    return [];
  }
  return txs;
}

async function transaction(txid: string, network: Network): Promise<Transaction | undefined> {
  const cacheKey = `${network}/${txid}`;
  const cachedTx = await redis.getData<Transaction>({ key: cacheKey });
  if (cachedTx) {
    return cachedTx;
  }
  const tx = await get("/transaction", { txid }, network);
  if (tx) {
    void redis.setData({ key: cacheKey, data: tx });
  }
  return tx;
}

async function balance(address: string, network: Network): Promise<Balance | undefined> {
  return get("/balance", { address }, network);
}

async function unspents(address: string, network: Network): Promise<Unspent[]> {
  const unspents = await get("/unspents", { address }, network);
  if (unspents === undefined) {
    return [];
  }
  return unspents;
}

async function inscriptions(outpoint: string, network: Network): Promise<Inscription[]> {
  return get("/inscriptions", { outpoint }, network);
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function get(path: string, data: unknown, network: Network): Promise<any> {
  if (path.indexOf("/") !== 0) {
    path = "/" + path;
  }

  const url = config.lookupEndpoint.replace("regtest", network) + path;
  const requestObject: RequestInit = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };

  if (data) {
    requestObject.body = JSON.stringify(data);
    requestObject.method = "POST";
  }

  const response = await fetch(url, requestObject);
  if (response.status === 200) {
    const json = await response.json();
    if (json.success === true) {
      return json.rdata;
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Balance = {
  int: number;
  value: string;
};

type Unspent = {
  txid: string;
  n: number;
  txHash: string;
  blockN: number;
  sats: number;
  scriptPubKey: ScriptPubKey;
  value: number;
  ordinals: Ordinal[];
  inscriptions: Inscription[];
};

export type Transaction = {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
  hex: string;
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
};

export type Vin = {
  txid: string;
  vout: number;
  scriptSig: ScriptSig;
  txinwitness: string[];
  sequence: number;
};

export type Vout = {
  value: number;
  n: number;
  scriptPubKey: ScriptPubKey;
  ordinals: Ordinal[];
  inscriptions: Inscription[];
};

type ScriptSig = {
  asm: string;
  hex: string;
};

type ScriptPubKey = {
  asm: string;
  desc: string;
  hex: string;
  address: string;
  type: string;
  utf8?: string;
};

export type Ordinal = {
  number: number;
  decimal: string;
  degree: string;
  name: string;
  height: number;
  cycle: number;
  epoch: number;
  period: number;
  offset: number;
  rarity: string; // [TODO] find the rarity values
  output: string;
  start: number;
  size: number;
};

export type Inscription = {
  id: string;
  outpoint: string;
  owner: string;
  fee: number;
  height: number;
  sat: number;
  timestamp: number;
  media_type: string;
  media_size: number;
  media_content: string;
};
