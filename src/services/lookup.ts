import fetch, { RequestInit } from "node-fetch";

import { config } from "../config";
import { redis } from "./redis";

export const lookup = {
  transactions,
  transaction,
  balance,
  unspents,
};

/*
 |--------------------------------------------------------------------------------
 | Service Methods
 |--------------------------------------------------------------------------------
 */

async function transactions(address: string): Promise<Transaction[]> {
  const txs = await get("/transactions", { address });
  if (txs === undefined) {
    return [];
  }
  return txs;
}

async function transaction(txid: string): Promise<Transaction | undefined> {
  const cachedTx = await redis.getData<Transaction>({ key: txid });
  if (cachedTx) {
    return cachedTx;
  }
  const tx = await get("/transaction", { txid });
  if (tx) {
    void redis.setData({ key: txid, data: tx });
  }
  return tx;
}

async function balance(address: string): Promise<Balance | undefined> {
  return get("/balance", { address });
}

async function unspents(address: string): Promise<Unspent[]> {
  const unspents = await get("/unspents", { address });
  if (unspents === undefined) {
    return [];
  }
  return unspents;
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function get(path: string, data: unknown): Promise<any> {
  if (path.indexOf("/") !== 0) {
    path = "/" + path;
  }

  const url = config.lookupEndpoint + path;
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

type Vin = {
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

export type Inscription<T = unknown> = T;
