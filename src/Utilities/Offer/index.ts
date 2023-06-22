import { IPFSOffer, IPFSOrder } from "../../Models/IPFS";
import { Transaction } from "../../Models/Transaction";
import { Lookup } from "../../Services/Lookup";
import { BTC_TO_SAT } from "../Bitcoin";
import { order as orderUtils } from "../Order";

export const offer = {
  getTakerTransaction,
};

/**
 * Get confirmed transaction from takers list of transactions.
 *
 * @param txid   - Order location transaction id.
 * @param order  - Order which the offer is based on.
 * @param offer  - Offer to get transaction for.
 * @param lookup - Lookup service to get transactions from.
 *
 * @returns Transaction if found, undefined otherwise.
 */
async function getTakerTransaction(
  txid: string,
  order: IPFSOrder,
  offer: IPFSOffer,
  lookup: Lookup
): Promise<Transaction | undefined> {
  const txs = await lookup.getTransactions(offer.taker);
  for (const tx of txs) {
    for (const vin of tx.vin) {
      const value = orderUtils.getPrice(order);
      if (
        vin.txid === txid &&
        tx.vout[0]?.scriptPubKey.address === offer.taker &&
        tx.vout[1]?.scriptPubKey.address === order.maker &&
        tx.vout[1]?.value === value / BTC_TO_SAT
      ) {
        return tx;
      }
    }
  }
}
