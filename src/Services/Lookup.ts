import debug from "debug";
import fetch, { RequestInit } from "node-fetch";

import { config } from "../Config";
import { Inscription, Ordinal, ScriptPubKey, Transaction } from "../Entities/Transaction";
import { Network } from "../Libraries/Network";

const log = debug("sado-lookup");

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
  return get("/transaction", { txid }, network);
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

  log("looking up '%s' '%o'", path, data);

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
