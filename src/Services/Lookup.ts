import debug from "debug";
import fetch, { RequestInit } from "node-fetch";

import { Inscription, Ordinal, ScriptPubKey, Transaction } from "../Collections/Transaction";
import { config } from "../Config";
import { DEFAULT_NETWORK, Network } from "../Libraries/Network";

const log = debug("sado-lookup");

export class Lookup {
  readonly balances = new Map<string, Balance>();
  readonly unspents = new Map<string, Unspent[]>();
  readonly inscriptions = new Map<string, Inscription[]>();
  readonly transactions = new Map<string, Transaction>();
  readonly prunedTransactions = new Map<string, Transaction>();
  readonly address = new Map<string, Transaction[]>();

  constructor(readonly network: Network) {}

  /**
   * Retrieve a transaction information.
   *
   * @param txid    - Transaction id to retrieve.
   * @param options - Result options to use when retrieving the transaction.
   *
   * @returns transaction information.
   */
  async getTransaction(txid: string, options: TransactionOptions = {}): Promise<Transaction | undefined> {
    const cachedTx = this.transactions.get(txid);
    if (cachedTx) {
      return cachedTx;
    }
    const tx = await this.#request("/transaction", { txid, options });
    if (tx !== undefined) {
      this.transactions.set(txid, tx);
    }
    return tx;
  }

  /**
   * Retrieve the transactions of an address via cursor.
   *
   * @param address - Address to retrieve the transactions for.
   * @param options - Result options to use when retrieving the transactions.
   *
   * @returns list of transactions.
   */
  async getTransactions(address: string, options: TransactionsOptions = {}): Promise<Transaction[]> {
    const cachedTxs = this.address.get(address);
    if (cachedTxs) {
      return cachedTxs;
    }
    const txs = await this.#request("/transactions", { address, options });
    if (txs !== undefined) {
      this.address.set(address, txs);
    }
    return txs ?? [];
  }

  /**
   * Retrieve the spendable transactions of an address.
   *
   * @param address - Address to retrieve the unspents for.
   * @param options - Result options to use when retrieving the unspents.
   *
   * @returns list of unspent utxos.
   */
  async getUnspents(address: string, options: UnspentOptions = {}): Promise<Unspent[]> {
    const cachedUnspents = await this.unspents.get(address);
    if (cachedUnspents !== undefined) {
      return cachedUnspents;
    }
    const unspents = await this.#request("/unspents", { address, options });
    if (unspents === undefined) {
      return [];
    }
    this.unspents.set(address, unspents);
    return unspents;
  }

  /**
   * Retrieve the balance of an address.
   *
   * @param address - Address to retrieve the balance for.
   *
   * @returns balance of the address.
   */
  async getBalance(address: string): Promise<Balance | undefined> {
    const cachedBalance = this.balances.get(address);
    if (cachedBalance) {
      return cachedBalance;
    }
    const balance = await this.#request("/balance", { address });
    if (balance !== undefined) {
      this.balances.set(address, balance);
    }
    return balance;
  }

  /**
   * Relay a signed transaction to the network.
   *
   * @param hex - The signed transaction hex.
   *
   * @returns
   */
  async relay(hex: string) {
    return this.#request("/relay", { hex });
  }

  async getInscriptions(outpoint: string): Promise<Inscription[]> {
    const cachedInscriptions = this.inscriptions.get(outpoint);
    if (cachedInscriptions) {
      return cachedInscriptions;
    }
    const inscriptions = await this.#request("/inscriptions", { outpoint });
    if (inscriptions !== undefined) {
      this.inscriptions.set(outpoint, inscriptions);
    }
    return inscriptions;
  }

  async #request(path: string, data: unknown): Promise<any> {
    if (path.indexOf("/") !== 0) {
      path = "/" + path;
    }

    const url = config.lookupEndpoint.replace(DEFAULT_NETWORK, this.network) + path;
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

    log("looking up '%s' '%o'", path, { ...(data ?? {}), network: this.network });

    const response = await fetch(url, requestObject);
    if (response.status === 200) {
      const json = await response.json();
      if (json.success === true && json.rdata !== false) {
        return json.rdata;
      }
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Request Options
 |--------------------------------------------------------------------------------
 */

type TransactionOptions = {
  noord?: boolean;
  nohex?: boolean;
  nowitness?: boolean;
};

type TransactionsOptions = {
  noord?: boolean;
  nohex?: boolean;
  nowitness?: boolean;
  before?: number;
  after?: number;
  limit?: number;
};

type UnspentOptions = {
  noord?: boolean;
  notsafetospend?: boolean;
  allowedrarity?: ["common", "uncommon", "rare", "epic", "legendary"];
  txhex?: boolean;
};

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Balance = {
  int: number;
  value: string;
};

export type Unspent = {
  txid: string;
  n: number;
  txHash: string;
  blockN: number;
  sats: number;
  scriptPubKey: ScriptPubKey;
  value: number;
  ordinals: Ordinal[];
  inscriptions: Inscription[];
  safeToSpend: boolean;
};
