import pLimit from "p-limit";

import { Offer } from "../Entities/Offer";
import { Order } from "../Entities/Order";
import { addOrderbookTransactions, Transaction } from "../Entities/Transaction";
import { Network } from "../Libraries/Network";
import { lookup } from "../Services/Lookup";
import { parseSado } from "./Utilities";

export async function resolveOrderbookTransactions(address: string, network: Network): Promise<void> {
  const txs = await lookup.transactions(address, network);
  if (txs.length === 0) {
    return; // no transactions to process
  }
  const sadoTxs = getSadoTransactions(txs);

  // ### Add Transaction
  // For any non-processed transaction in the address, add it to the database.

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

  await resolvePendingOrders(address, network);
  await resolvePendingOffers(address, network);
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function resolvePendingOrders(address: string, network: Network): Promise<void> {
  const limit = pLimit(4);
  const pending = await Order.getByStatus("pending", address, network);
  await Promise.all(pending.map((order) => limit(() => order.resolve())));
}

async function resolvePendingOffers(address: string, network: Network): Promise<void> {
  const limit = pLimit(4);
  const pending = await Offer.getByStatus("pending", address, network);
  await Promise.all(pending.map((offer) => limit(() => offer.resolve())));
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
