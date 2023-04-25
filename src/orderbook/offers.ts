import moment from "moment";

import { hasSignature, parseLocation } from "../libraries/transaction";
import { infura, Offer, Order } from "../services/infura";
import { lookup, Transaction, Vout } from "../services/lookup";
import {
  InfuraException,
  InvalidOfferOwnerException,
  InvalidOwnerLocationException,
  InvalidSignatureException,
  OrdinalsMovedException,
  OriginNotFoundException,
  TransactionNotFoundException,
  VoutOutOfRangeException,
} from "./exceptions";
import { ItemContent, ItemException } from "./types";

export class Offers {
  readonly #pending: PendingOfferItem[] = [];
  readonly #rejected: RejectedOfferItem[] = [];
  readonly #completed: CompletedOfferItem[] = [];

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get pending() {
    return this.#pending;
  }

  get rejected() {
    return this.#rejected;
  }

  get completed() {
    return this.#completed;
  }

  /*
   |--------------------------------------------------------------------------------
   | Handlers
   |--------------------------------------------------------------------------------
   */

  async push(cid: string): Promise<void> {
    const offer = await infura.getOffer(cid);
    if ("error" in offer) {
      return this.#reject(cid, offer.data, new InfuraException(offer.error, { cid }));
    }

    const order = await infura.getOrder(offer.origin);
    if ("error" in order) {
      return this.#reject(cid, offer, new OriginNotFoundException(offer.origin));
    }

    offer.order = order;

    const owner = await getOwner(order.location);
    if (owner === undefined) {
      return this.#reject(cid, offer, new InvalidOwnerLocationException(order.location));
    }

    if (hasSignature(offer.offer) === false) {
      return this.#reject(cid, offer, new InvalidSignatureException());
    }

    if ((owner === order.maker || owner === offer.taker) === false) {
      return this.#reject(cid, offer, new InvalidOfferOwnerException(owner, order.maker, offer.taker));
    }

    const [txid, voutN] = parseLocation(order!.location);

    // ### Validate Offer

    const tx = await lookup.transaction(txid);
    if (tx === undefined) {
      return this.#reject(cid, offer, new TransactionNotFoundException(txid));
    }

    const vout = tx.vout.find((item) => item.n === voutN);
    if (vout === undefined) {
      return this.#reject(cid, offer, new VoutOutOfRangeException(voutN));
    }

    if (hasOrdinalsAndInscriptions(vout) === false) {
      if (order.type === "sell") {
        const tx = await getTakerTransaction(txid, order, offer);
        if (tx === undefined) {
          return this.#reject(cid, offer, new OrdinalsMovedException());
        }
      } else if (order.type === "buy") {
        console.log("SOMEONE BE OFFERING BUYING STUFF");
        return this.#reject(cid, offer, new OrdinalsMovedException());
      }
      return this.#complete(cid, offer, tx);
    }

    // ### Add Offer

    this.#add(cid, offer, vout);
  }

  #add(cid: string, offer: Offer, vout: Vout): void {
    this.#pending.push({
      ...offer,
      ...this.#getTypeMap(offer),
      ago: moment(offer.ts).fromNow(),
      cid,
      ordinals: vout.ordinals,
      inscriptions: vout.inscriptions,
    });
  }

  #reject(cid: string, offer: Offer, reason: ItemException): void {
    this.#rejected.push({
      reason,
      ...offer,
      ...this.#getTypeMap(offer),
      ago: moment(offer.ts).fromNow(),
      cid,
    });
  }

  #complete(cid: string, offer: Offer, proof: Transaction): void {
    this.#completed.push({
      ...offer,
      ...this.#getTypeMap(offer),
      ago: moment(offer.ts).fromNow(),
      cid,
      proof,
    });
  }

  #getTypeMap(offer: any) {
    if (offer.type === "buy") {
      return { buy: true, sell: false };
    }
    return { buy: false, sell: true };
  }
}

function hasOrdinalsAndInscriptions(vout: Vout): boolean {
  return vout.ordinals.length > 0 && vout.inscriptions.length > 0;
}

/**
 * Get confirmed transaction from takers list of transactions.
 *
 * @param txid  - Order location transaction id.
 * @param order - Order which the offer is based on.
 * @param offer - Offer to get transaction for.
 *
 * @returns Transaction if found, undefined otherwise.
 */
async function getTakerTransaction(txid: string, order: Order, offer: Offer): Promise<Transaction | undefined> {
  const txs = await lookup.transactions(offer.taker);
  for (const tx of txs) {
    for (const vin of tx.vin) {
      const value = order.cardinals ?? order.satoshis ?? 0;
      if (
        vin.txid === txid &&
        tx.vout[0]?.scriptPubKey.address === offer.taker &&
        tx.vout[1]?.scriptPubKey.address === order.maker &&
        tx.vout[1]?.value === value / 100_000_000
      ) {
        return tx;
      }
    }
  }
}

async function getOwner(location: string): Promise<string | undefined> {
  const [txid, vout] = parseLocation(location);
  const tx = await lookup.transaction(txid);
  if (tx === undefined) {
    return undefined;
  }
  return tx.vout[vout]?.scriptPubKey?.address;
}

type PendingOfferItem = Offer & OfferMeta & ItemContent;

type RejectedOfferItem = { reason: ItemException } & Offer & OfferMeta;

type CompletedOfferItem = Offer & OfferMeta & { proof: Transaction };

type OfferMeta = { order?: Order; buy: boolean; sell: boolean; ago: string; cid: string };
