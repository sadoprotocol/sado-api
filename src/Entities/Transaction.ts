import { WithId } from "mongodb";

import { Network } from "../Libraries/Network";
import { db } from "../Services/Mongo";

export const collection = db.collection<Transaction>("transactions");

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

/**
 * Bulk inserts a list of orderbook transactions into the database. If a
 * transaction already exists in the database, it will be skipped.
 *
 * @param txs     - List of transactions to insert.
 * @param address - Orderbook address which these transactions originate from.
 * @param network - Network which these transactions were found on.
 *
 * @returns The inserted transactions.
 */
export async function addOrderbookTransactions(
  txs: Transaction[],
  address: string,
  network: Network
): Promise<Transaction[]> {
  const result = await collection.bulkWrite(
    txs.map((tx) => {
      tx.network = network; // assign the network the transaction was found on
      tx.from = address; // assign the originating address
      tx.blocktime = tx.blocktime * 1000; // convert to milliseconds
      return {
        updateOne: {
          filter: { txid: tx.txid },
          update: { $set: tx },
          upsert: true,
        },
      };
    })
  );
  return Object.keys(result.upsertedIds).map((index) => txs[parseInt(index)]);
}

/**
 * Inserts a transaction into the database. If a transaction already exists in
 * the database, it will be updated.
 *
 * @param tx      - Transaction to insert.
 * @param network - Network which this transaction was found on.
 *
 * @returns The inserted transaction.
 */
export async function addTransaction(tx: Transaction, network: Network): Promise<Transaction> {
  tx.network = network; // assign the network the transaction was found on
  tx.blocktime = tx.blocktime * 1000; // convert to milliseconds
  await collection.insertOne(tx).catch((err) => {
    if (err.code === 11000) {
      return; // skip duplicate since tx are immutable and don't need updating
    }
    throw err;
  });
  return tx;
}

/**
 * Retrieves a transaction from the database. If a transaction does not exist
 * in the database, it will be retrieved from the blockchain and inserted into
 * the database.
 *
 * @param txid    - Transaction ID to retrieve.
 * @param network - Network which this transaction was found on.
 *
 * @returns The transaction if found, otherwise undefined.
 */
export async function getTransaction(txid: string, network: Network): Promise<WithId<Transaction> | undefined> {
  const tx = await collection.findOne({ txid, network });
  if (tx === null) {
    return undefined;
  }
  return tx;
}

export async function flushTransactions(address: string): Promise<void> {
  await collection.deleteMany({ from: address });
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type Transaction = {
  txid: string;
  hash: string;
  network: Network;
  from: string; // address which this transaction originates from
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
  type: "order" | "offer"; // tx type in relation to a sado order|offer
  cid: string; // sado CID
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
  spent:
    | false
    | {
        bestblock: string;
        confirmations: number;
        coinbase: boolean;
      };
};

export type ScriptSig = {
  asm: string;
  hex: string;
};

export type ScriptPubKey = {
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
