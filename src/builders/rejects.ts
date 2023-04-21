import type { Offer } from "../services/infura";
import type { OrderBookOffer, OrderBookOrder, OrderBookReject } from "./types";

export class OrderbookRejects {
  #count = 0;

  readonly #rejects: OrderBookReject[] = [];

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get count() {
    return this.#count;
  }

  /*
   |--------------------------------------------------------------------------------
   | Order Errors
   |--------------------------------------------------------------------------------
   */

  orderNotFound(cid: string): void {
    this.#add({
      type: "order",
      code: "ORDER_NOT_FOUND",
      message: `Order with CID '${cid}' does not exist`,
      reject: cid,
    });
  }

  orderMissingOrdinalsAndInscriptions(order: OrderBookOrder): void {
    this.#add({
      type: "order",
      code: "ORDER_MISSING_ORDINALS_AND_INSCRIPTIONS",
      message: `Order is missing ordinals and inscriptions`,
      reject: order,
    });
  }

  /*
   |--------------------------------------------------------------------------------
   | Offer Errors
   |--------------------------------------------------------------------------------
   */

  offerNotFound(cid: string): void {
    this.#add({
      type: "offer",
      code: "OFFER_NOT_FOUND",
      message: `Offer with CID '${cid}' does not exist`,
      reject: cid,
    });
  }

  offerSignatureInvalid(cid: string, offer: Offer): void {
    this.#add({
      type: "offer",
      code: "OFFER_SIGNATURE_INVALID",
      message: `Offer with CID '${cid}' has an invalid offer signature`,
      reject: offer,
    });
  }

  offerOriginNotFound(cid: string, offer: Offer): void {
    this.#add({
      type: "offer",
      code: "OFFER_ORIGIN_NOT_FOUND",
      message: `Offer with CID '${cid}' is missing origin order`,
      reject: offer,
    });
  }

  offerMissingOrdinalsAndInscriptions(offer: OrderBookOffer): void {
    this.#add({
      type: "offer",
      code: "OFFER_MISSING_ORDINALS_AND_INSCRIPTIONS",
      message: `Offer is missing ordinals and inscriptions`,
      reject: offer,
    });
  }

  /*
   |--------------------------------------------------------------------------------
   | Mutators
   |--------------------------------------------------------------------------------
   */

  #add(reject: OrderBookReject) {
    this.#rejects.push(reject);
    this.#count++;
  }

  /*
   |--------------------------------------------------------------------------------
   | Compilers
   |--------------------------------------------------------------------------------
   */

  toJSON() {
    return this.#rejects;
  }
}
