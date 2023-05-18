import { Offer } from "../Entities/Offer";
import { Order } from "../Entities/Order";
import { addOrderbookTransactions, Transaction } from "../Entities/Transaction";
import { Network } from "../Libraries/Network";
import { Lookup } from "../Services/Lookup";
import { sendOfferNotification, sendOrderNotification } from "../Services/Notification";
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

  const result: (Order | Offer)[] = [];

  const nextTxs = await addOrderbookTransactions(sadoTxs, address, network);
  for (const tx of nextTxs) {
    if (tx.type === "order") {
      const order = await Order.insert(tx);
      if (order !== undefined) {
        result.push(order);
      }
    }
    if (tx.type === "offer") {
      const offer = await Offer.insert(tx, lookup);
      if (offer !== undefined) {
        result.push(offer);
      }
    }
  }

  // ### Resolve Pending
  // Run through pending orders and offers, checking of changes and transitioning
  // their states as necessary.

  await resolvePendingOrders(address, lookup);
  await resolvePendingOffers(address, lookup);

  // ### Notify
  // Loop through new orders and offers and send notifications for them.
  // For now we only do this on mainnet to avoid spamming the Slack channel which
  // is for mainnet only at this time.

  if (lookup.network === "mainnet") {
    for (const item of result) {
      if (item instanceof Order) {
        await sendOrderNotification(item);
      }
      if (item instanceof Offer) {
        await sendOfferNotification(item);
      }
    }
  }
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
    await offer.resolve(lookup);
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
