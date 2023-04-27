import debug from "debug";
import moment from "moment";

import { BTC_TO_SAT } from "../libraries/bitcoin";
import { Network } from "../libraries/network";
import { getTypeMap } from "../libraries/response";
import { hasOrdinalsAndInscriptions, hasSignature, parseLocation } from "../libraries/transaction";
import { infura, Offer, Order } from "../services/infura";
import { lookup, Transaction, Vout } from "../services/lookup";
import { redis } from "../services/redis";
import { OffersAnalytics } from "./analytics/offers";
import {
  InfuraException,
  InsufficientFundsException,
  InvalidOfferOwnerException,
  InvalidOwnerLocationException,
  InvalidSignatureException,
  OrdinalsMovedException,
  OriginNotFoundException,
  TransactionNotFoundException,
  VoutOutOfRangeException,
} from "./exceptions";
import { ItemContent, ItemException } from "./types";
import { getAskingPrice, getOrderOwner } from "./utilities";

const log = debug("sado-offers");

export class Offers {
  readonly #pending: PendingOfferItem[] = [];
  readonly #rejected: RejectedOfferItem[] = [];
  readonly #completed: CompletedOfferItem[] = [];

  readonly #analytics = new OffersAnalytics();

  constructor(readonly network: Network) {}

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

  get analytics() {
    return this.#analytics.toJSON();
  }

  /*
   |--------------------------------------------------------------------------------
   | Handlers
   |--------------------------------------------------------------------------------
   */

  async push(cid: string, value: number | undefined): Promise<void> {
    log(`Resolving offer ${cid}`);

    const offer = await infura.getOffer(cid);
    if ("error" in offer) {
      return this.#reject(cid, offer.data, new InfuraException(offer.error, { cid }));
    }

    if (value === undefined) {
      return this.#reject(cid, offer, new InsufficientFundsException());
    }

    const order = await infura.getOrder(offer.origin);
    if ("error" in order) {
      return this.#reject(cid, offer, new OriginNotFoundException(offer.origin));
    }

    offer.order = order;

    const owner = await getOrderOwner(order, this.network);
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

    const tx = await lookup.transaction(txid, this.network);
    if (tx === undefined) {
      return this.#reject(cid, offer, new TransactionNotFoundException(txid));
    }

    const vout = tx.vout.find((item) => item.n === voutN);
    if (vout === undefined) {
      return this.#reject(cid, offer, new VoutOutOfRangeException(voutN));
    }

    if (hasOrdinalsAndInscriptions(vout) === false) {
      if (order.type === "sell") {
        const tx = await getTakerTransaction(txid, order, offer, this.network);
        if (tx === undefined) {
          return this.#reject(cid, offer, new OrdinalsMovedException());
        }
        return this.#complete(cid, offer, tx.txid, value);
      }
      if (order.type === "buy") {
        return this.#reject(cid, offer, new OrdinalsMovedException());
      }
    }

    // ### Add Offer

    this.#add(cid, offer, vout, value);
  }

  #add(cid: string, offer: Offer, vout: Vout, value: number): void {
    this.#analytics.addPending(offer);
    this.#pending.push({
      ...offer,
      ...getTypeMap(offer),
      ago: moment(offer.ts).fromNow(),
      cid,
      value,
      ordinals: vout.ordinals,
      inscriptions: vout.inscriptions,
    });
  }

  #reject(cid: string, offer: Offer, reason: ItemException): void {
    this.#rejected.push({
      reason,
      ...offer,
      ...getTypeMap(offer),
      ago: moment(offer.ts).fromNow(),
      cid,
    });
  }

  #complete(cid: string, offer: Offer, proof: string, value: number): void {
    this.#analytics.addCompleted(offer);
    this.#completed.push({
      ...offer,
      ...getTypeMap(offer),
      ago: moment(offer.ts).fromNow(),
      cid,
      value,
      proof,
    });
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

/**
 * Get confirmed transaction from takers list of transactions.
 *
 * @param txid    - Order location transaction id.
 * @param order   - Order which the offer is based on.
 * @param offer   - Offer to get transaction for.
 * @param network - Network to lookup transaction on.
 *
 * @returns Transaction if found, undefined otherwise.
 */
async function getTakerTransaction(
  txid: string,
  order: Order,
  offer: Offer,
  network: Network
): Promise<Transaction | undefined> {
  log(`Looking up taker transaction for taker ${offer.taker}`);

  // ### Check Cache

  const cacheKey = `${txid}/${order.maker}/${offer.taker}`;
  const cached = await redis.getData<Transaction>({ key: cacheKey });
  if (cached !== undefined) {
    log(`Found taker transaction ${cached.txid} for taker ${offer.taker} in cache`);
    return cached;
  }

  // ### Check Ordit

  const txs = await lookup.transactions(offer.taker, network);
  for (const tx of txs) {
    for (const vin of tx.vin) {
      const value = getAskingPrice(order);
      if (
        vin.txid === txid &&
        tx.vout[0]?.scriptPubKey.address === offer.taker &&
        tx.vout[1]?.scriptPubKey.address === order.maker &&
        tx.vout[1]?.value === value / BTC_TO_SAT
      ) {
        log(`Found taker transaction ${tx.txid} for taker ${offer.taker}`);
        redis.setData({ key: cacheKey, data: tx });
        return tx;
      }
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type PendingOfferItem = Offer & OfferMeta & ItemContent;

type RejectedOfferItem = { reason: ItemException } & Offer & Omit<OfferMeta, "value">;

type CompletedOfferItem = Offer & OfferMeta & { proof: string };

type OfferMeta = { order?: Order; buy: boolean; sell: boolean; ago: string; cid: string; value: number };
