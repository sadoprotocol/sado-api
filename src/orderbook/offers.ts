import moment from "moment";

import { hasSignature, parseLocation } from "../libraries/transaction";
import { infura, Offer } from "../services/infura";
import { lookup, Vout } from "../services/lookup";
import {
  ContentMissingException,
  InfuraException,
  InvalidOfferOwnerException,
  InvalidOwnerLocationException,
  InvalidSignatureException,
  OriginNotFoundException,
  TransactionNotFoundException,
  VoutOutOfRangeException,
} from "./exceptions";
import { ItemContent, ItemRejectedStatus, ItemStatus } from "./types";

export class Offers {
  readonly #items: OfferItem[] = [];

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get items() {
    return this.#items;
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
      return this.#reject(cid, offer, new ContentMissingException());
    }

    // ### Add Offer

    this.#add(cid, offer, vout, "pending"); // [TODO] Get completion status of the offer ...
  }

  #add(cid: string, offer: Offer, vout: Vout, status: "pending" | "completed"): void {
    this.#items.push({
      status,
      cid,
      ago: moment(offer.ts).fromNow(),
      ...this.#getTypeMap(offer),
      ...offer,
      ordinals: vout.ordinals,
      inscriptions: vout.inscriptions,
    });
  }

  #reject(cid: string, offer: Offer, reason: ItemRejectedStatus["reason"]): void {
    this.#items.push({
      status: "rejected",
      reason,
      cid,
      ago: moment(offer.ts).fromNow(),
      ...this.#getTypeMap(offer),
      ...offer,
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

async function getOwner(location: string): Promise<string | undefined> {
  const [txid, vout] = parseLocation(location);
  const tx = await lookup.transaction(txid);
  if (tx === undefined) {
    return undefined;
  }
  return tx.vout[vout]?.scriptPubKey?.address;
}

type OfferItem = ItemStatus & { cid: string; ago: string; buy: boolean; sell: boolean } & Offer & ItemContent;
