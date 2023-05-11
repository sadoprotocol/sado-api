import debug from "debug";
import fetch, { RequestInit } from "node-fetch";

import { config } from "../Config";
import { getTransaction, Inscription, Ordinal, ScriptPubKey, Transaction } from "../Entities/Transaction";
import { Network } from "../Libraries/Network";

const log = debug("sado-lookup");

export class Lookup {
  readonly balances = new Map<string, Balance>();
  readonly unspents = new Map<string, Unspent[]>();
  readonly inscriptions = new Map<string, Inscription[]>();
  readonly transactions = new Map<string, Transaction>();
  readonly address = new Map<string, Transaction[]>();

  constructor(readonly network: Network) {}

  async getBalance(address: string): Promise<Balance | undefined> {
    const cachedBalance = this.balances.get(address);
    if (cachedBalance) {
      return cachedBalance;
    }
    const balance = await get("/balance", { address }, this.network);
    if (balance !== undefined) {
      this.balances.set(address, balance);
    }
    return balance;
  }

  async getUnspents(address: string): Promise<Unspent[]> {
    const cachedUnspents = await this.unspents.get(address);
    if (cachedUnspents !== undefined) {
      return cachedUnspents;
    }
    const unspents = await get("/unspents", { address }, this.network);
    if (unspents === undefined) {
      return [];
    }
    this.unspents.set(address, unspents);
    return unspents;
  }

  async getInscriptions(outpoint: string): Promise<Inscription[]> {
    const cachedInscriptions = this.inscriptions.get(outpoint);
    if (cachedInscriptions) {
      return cachedInscriptions;
    }
    const inscriptions = await get("/inscriptions", { outpoint }, this.network);
    if (inscriptions !== undefined) {
      this.inscriptions.set(outpoint, inscriptions);
    }
    return inscriptions;
  }

  async getTransaction(txid: string): Promise<Transaction | undefined> {
    const cachedTx = this.transactions.get(txid);
    if (cachedTx) {
      return cachedTx;
    }
    const tx = (await getTransaction(txid, this.network)) ?? (await get("/transaction", { txid }, this.network));
    if (tx !== undefined) {
      this.transactions.set(txid, tx);
    }
    return tx;
  }

  async getTransactions(address: string): Promise<Transaction[]> {
    const cachedTxs = this.address.get(address);
    if (cachedTxs) {
      return cachedTxs;
    }
    const txs = await get("/transactions", { address }, this.network);
    if (txs !== undefined) {
      this.address.set(address, txs);
    }
    return txs ?? [];
  }
}

/*
 |--------------------------------------------------------------------------------
 | Request Handler
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
