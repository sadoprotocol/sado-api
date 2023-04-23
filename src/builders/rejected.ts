import type { Offer, Order } from "../services/infura";
import type { OrderBookOffer, OrderBookOrder, OrderBookReject } from "./types";

export class OrderBookRejected {
  readonly #rejected: OrderBookReject[] = [];

  /*
   |--------------------------------------------------------------------------------
   | Order Errors
   |--------------------------------------------------------------------------------
   */

  orderInfuraException(cid: string, message: string, data: any): void {
    this.#add({
      type: "order",
      code: "ORDER_INFURA_EXCEPTION",
      message,
      data,
      order: cid,
    });
  }

  orderOwnerInvalid(cid: string, order: Order): void {
    this.#add({
      type: "order",
      code: "ORDER_OWNER_INVALID",
      message: `Order CID '${cid}' has an invalid owner`,
      order,
    });
  }

  orderMissingOrdinalsAndInscriptions(order: OrderBookOrder): void {
    this.#add({
      type: "order",
      code: "ORDER_MISSING_ORDINALS_AND_INSCRIPTIONS",
      message: `Order is missing ordinals and inscriptions`,
      order,
    });
  }

  orderTxNotFound(txid: string, order: OrderBookOrder): void {
    this.#add({
      type: "order",
      code: "ORDER_TRANSACTION_NOT_FOUND",
      message: `Order transaction '${txid}' does not exist`,
      order,
    });
  }

  orderVoutOutOfRange(voutN: number, order: OrderBookOrder): void {
    this.#add({
      type: "order",
      code: "ORDER_VOUT_OUT_OF_RANGE",
      message: `Order vout '${voutN}' is out of range`,
      order,
    });
  }

  /*
   |--------------------------------------------------------------------------------
   | Offer Errors
   |--------------------------------------------------------------------------------
   */

  offerInfuraException(cid: string, message: string, data: any): void {
    this.#add({
      type: "offer",
      code: "OFFER_INFURA_EXCEPTION",
      message,
      data,
      offer: cid,
    });
  }

  offerOwnerInvalid(cid: string, offer: Offer): void {
    this.#add({
      type: "offer",
      code: "OFFER_OWNER_INVALID",
      message: `Offer CID '${cid}' has an invalid owner`,
      offer,
    });
  }

  offerSignatureInvalid(cid: string, offer: Offer): void {
    this.#add({
      type: "offer",
      code: "OFFER_SIGNATURE_INVALID",
      message: `Offer CID '${cid}' has an invalid offer signature`,
      offer,
    });
  }

  offerOriginNotFound(cid: string, offer: Offer): void {
    this.#add({
      type: "offer",
      code: "OFFER_ORIGIN_NOT_FOUND",
      message: `Offer CID '${cid}' is missing origin order`,
      offer,
    });
  }

  offerMissingOrdinalsAndInscriptions(offer: OrderBookOffer): void {
    this.#add({
      type: "offer",
      code: "OFFER_MISSING_ORDINALS_AND_INSCRIPTIONS",
      message: `Offer is missing ordinals and inscriptions`,
      offer,
    });
  }

  offerTxNotFound(txid: string, offer: OrderBookOffer): void {
    this.#add({
      type: "offer",
      code: "OFFER_TRANSACTION_NOT_FOUND",
      message: `Offer transaction '${txid}' does not exist`,
      offer,
    });
  }

  offerVoutOutOfRange(voutN: number, offer: OrderBookOffer): void {
    this.#add({
      type: "offer",
      code: "OFFER_VOUT_OUT_OF_RANGE",
      message: `Offer vout ${voutN} is out of range`,
      offer,
    });
  }

  /*
   |--------------------------------------------------------------------------------
   | Mutators
   |--------------------------------------------------------------------------------
   */

  #add(reject: OrderBookReject) {
    this.#rejected.push(reject);
  }

  /*
   |--------------------------------------------------------------------------------
   | Compilers
   |--------------------------------------------------------------------------------
   */

  toJSON() {
    return this.#rejected;
  }
}
