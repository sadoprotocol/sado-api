import pLimit from "p-limit";

import { Offer } from "../Entities/Offer";
import { Order } from "../Entities/Order";
import { addOrderbookTransactions, Transaction } from "../Entities/Transaction";
import { Network } from "../Libraries/Network";
import { Lookup } from "../Services/Lookup";
import { parseSado } from "./Utilities";

export async function resolveOrderbookTransactions(address: string, network: Network): Promise<void> {
  const lookup = new Lookup(network);

  const txs = await lookup.getTransactions(address);
  if (txs.length === 0) {
    return; // no transactions to process
  }
  const sadoTxs = getSadoTransactions(txs);

  // ### Add Transactions
  // For any non-processed transactions in the address, add them to the database.

  const limit = pLimit(4);
  const nextTxs = await addOrderbookTransactions(sadoTxs, address, network);
  await Promise.all(
    nextTxs.map((tx) =>
      limit(() => {
        if (tx.type === "order") {
          return Order.insert(tx);
        }
        if (tx.type === "offer") {
          return Offer.insert(tx);
        }
      })
    )
  );

  // ### Resolve Pending
  // Run through pending orders and offers, checking of changes and transitioning
  // their states as necessary.

  await resolvePendingOrders(address, lookup);
  await resolvePendingOffers(address, lookup);
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function resolvePendingOrders(address: string, lookup: Lookup): Promise<void> {
  const pending = await Order.getByStatus("pending", address, lookup.network);
  for (const order of pending) {
    await order.resolve(lookup);
  }
}

async function resolvePendingOffers(address: string, lookup: Lookup): Promise<void> {
  const pending = await Offer.getByStatus("pending", address, lookup.network);
  for (const offer of pending) {
    await offer.resolve();
  }
}

function getSadoTransactions(txs: Transaction[]): Transaction[] {
  const sadoTxs = [];
  for (const tx of txs) {
    for (const vout of tx.vout) {
      const sado = parseSado(vout.scriptPubKey.utf8);
      if (sado !== undefined) {
        tx.type = sado.type;
        tx.cid = sado.cid;
        sadoTxs.push(tx);
      }
    }
  }
  return sadoTxs;
}
