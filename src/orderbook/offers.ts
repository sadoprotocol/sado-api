import debug from "debug";
import moment from "moment";

import { Network } from "../libraries/network";
import { hasSignature, parseLocation } from "../libraries/transaction";
import { infura, Offer, Order } from "../services/infura";
import { lookup, Transaction, Vout } from "../services/lookup";
import { redis } from "../services/redis";
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

const log = debug("sado-offers");

export class Offers {
  readonly #pending: PendingOfferItem[] = [];
  readonly #rejected: RejectedOfferItem[] = [];
  readonly #completed: CompletedOfferItem[] = [];

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

  /*
   |--------------------------------------------------------------------------------
   | Handlers
   |--------------------------------------------------------------------------------
   */

  async push(cid: string, value: number): Promise<void> {
    log(`Resolving offer ${cid}`);

    const offer = await infura.getOffer(cid);
    if ("error" in offer) {
      return this.#reject(cid, offer.data, new InfuraException(offer.error, { cid }), value);
    }

    const order = await infura.getOrder(offer.origin);
    if ("error" in order) {
      return this.#reject(cid, offer, new OriginNotFoundException(offer.origin), value);
    }

    offer.order = order;

    const owner = await getOwner(order.location, this.network);
    if (owner === undefined) {
      return this.#reject(cid, offer, new InvalidOwnerLocationException(order.location), value);
    }

    if (hasSignature(offer.offer) === false) {
      return this.#reject(cid, offer, new InvalidSignatureException(), value);
    }

    if ((owner === order.maker || owner === offer.taker) === false) {
      return this.#reject(cid, offer, new InvalidOfferOwnerException(owner, order.maker, offer.taker), value);
    }

    const [txid, voutN] = parseLocation(order!.location);

    // ### Validate Offer

    const tx = await lookup.transaction(txid, this.network);
    if (tx === undefined) {
      return this.#reject(cid, offer, new TransactionNotFoundException(txid), value);
    }

    const vout = tx.vout.find((item) => item.n === voutN);
    if (vout === undefined) {
      return this.#reject(cid, offer, new VoutOutOfRangeException(voutN), value);
    }

    if (hasOrdinalsAndInscriptions(vout) === false) {
      if (order.type === "sell") {
        const tx = await getTakerTransaction(txid, order, offer, this.network);
        if (tx === undefined) {
          return this.#reject(cid, offer, new OrdinalsMovedException(), value);
        }
        return this.#complete(cid, offer, tx.txid, value);
      }
      if (order.type === "buy") {
        return this.#reject(cid, offer, new OrdinalsMovedException(), value);
      }
    }

    // ### Add Offer

    this.#add(cid, offer, vout, value);
  }

  #add(cid: string, offer: Offer, vout: Vout, value: number): void {
    this.#pending.push({
      ...offer,
      ...this.#getTypeMap(offer),
      ago: moment(offer.ts).fromNow(),
      cid,
      value,
      ordinals: vout.ordinals,
      inscriptions: vout.inscriptions,
    });
  }

  #reject(cid: string, offer: Offer, reason: ItemException, value: number): void {
    this.#rejected.push({
      reason,
      ...offer,
      ...this.#getTypeMap(offer),
      ago: moment(offer.ts).fromNow(),
      cid,
      value,
    });
  }

  #complete(cid: string, offer: Offer, proof: string, value: number): void {
    this.#completed.push({
      ...offer,
      ...this.#getTypeMap(offer),
      ago: moment(offer.ts).fromNow(),
      cid,
      value,
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
      const value = order.cardinals ?? order.satoshis ?? 0;
      if (
        vin.txid === txid &&
        tx.vout[0]?.scriptPubKey.address === offer.taker &&
        tx.vout[1]?.scriptPubKey.address === order.maker &&
        tx.vout[1]?.value === value / 100_000_000
      ) {
        log(`Found taker transaction ${tx.txid} for taker ${offer.taker}`);
        redis.setData({ key: cacheKey, data: tx });
        return tx;
      }
    }
  }
}

async function getOwner(location: string, network: Network): Promise<string | undefined> {
  const [txid, vout] = parseLocation(location);
  const tx = await lookup.transaction(txid, network);
  if (tx === undefined) {
    return undefined;
  }
  return tx.vout[vout]?.scriptPubKey?.address;
}

type PendingOfferItem = Offer & OfferMeta & ItemContent;

type RejectedOfferItem = { reason: ItemException } & Offer & OfferMeta;

type CompletedOfferItem = Offer & OfferMeta & { proof: string };

type OfferMeta = { order?: Order; buy: boolean; sell: boolean; ago: string; cid: string; value: number };
