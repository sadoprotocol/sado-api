import moment from "moment";

import { Network } from "../libraries/network";
import { getAddressVoutValue, hasOrdinalsAndInscriptions, hasSignature, parseLocation } from "../libraries/transaction";
import { infura, Offer as IPFSOffer, Order as IPFSOrder } from "../services/infura";
import { lookup, Transaction, Vin, Vout } from "../services/lookup";
import {
  InsufficientFundsException,
  InvalidOfferOwnerException,
  InvalidOwnerLocationException,
  InvalidSignatureException,
  OrdinalsMovedException,
  TransactionNotFoundException,
  VoutOutOfRangeException,
} from "./exceptions";
import { getOrderOwner, getOrderPrice, getTakerTransaction } from "./utilities";

export class Offer {
  status: OfferStatus = "pending";
  time: OfferTime;

  vout?: Vout;
  value?: number;
  proof?: string;
  rejection?: any;

  constructor(
    readonly cid: string,
    readonly data: IPFSOffer,
    readonly order: IPFSOrder,
    readonly context: OfferContext
  ) {
    const blockTime = context.tx.blocktime * 1000;
    this.time = {
      offer: data.ts,
      block: blockTime,
      ago: moment(blockTime).fromNow(),
    };
  }

  /*
   |--------------------------------------------------------------------------------
   | Factories
   |--------------------------------------------------------------------------------
   */

  static async from(cid: string, context: OfferContext): Promise<Offer | undefined> {
    const data = await infura.getOffer(cid);
    if ("error" in data) {
      return undefined;
    }
    const order = await infura.getOrder(data.origin);
    if ("error" in order) {
      return undefined;
    }
    order.price = getOrderPrice(order);
    return new Offer(cid, data, order, context);
  }

  /*
   |--------------------------------------------------------------------------------
   | Resolve
   |--------------------------------------------------------------------------------
   */

  async resolve(): Promise<void> {
    try {
      await this.#hasListingFee();
      await this.#hasValidOffer();
      await this.#hasValidSignature();
      await this.#hasValidTransaction();
      await this.#fulfill();
    } catch (err) {
      this.status = "rejected";
      this.rejection = err;
    }
  }

  async #hasListingFee(): Promise<void> {
    const value = (this.value = getAddressVoutValue(this.context.tx, this.context.address));
    if (value === undefined || value <= 0) {
      throw new InsufficientFundsException();
    }
  }

  async #hasValidOffer(): Promise<void> {
    const owner = await getOrderOwner(this.order, this.context.network);
    if (owner === undefined) {
      throw new InvalidOwnerLocationException(this.order.location);
    }
    if ((owner === this.order.maker || owner === this.data.taker) === false) {
      throw new InvalidOfferOwnerException(owner, this.order.maker, this.data.taker);
    }
  }

  async #hasValidSignature(): Promise<void> {
    if (hasSignature(this.data.offer) === false) {
      throw new InvalidSignatureException();
    }
  }

  async #hasValidTransaction(): Promise<void> {
    const [txid, voutN] = parseLocation(this.order.location);
    const tx = await lookup.transaction(txid, this.context.network);
    if (tx === undefined) {
      throw new TransactionNotFoundException(txid);
    }
    const vout = (this.vout = tx.vout.find((item) => item.n === voutN));
    if (vout === undefined) {
      throw new VoutOutOfRangeException(voutN);
    }
  }

  async #fulfill(): Promise<void> {
    if (this.vout !== undefined && hasOrdinalsAndInscriptions(this.vout) === true) {
      return; // order is not fulfilled
    }
    if (this.order.type === "sell") {
      const [txid] = parseLocation(this.order.location);
      const tx = await getTakerTransaction(txid, this.order, this.data, this.context.network);
      if (tx === undefined) {
        throw new OrdinalsMovedException();
      }
      if (this.#hasValidProof(txid, tx.vin) === false) {
        throw new Error("Invalid proof");
      }
      this.proof = tx.txid;
      this.status = "completed";
    }
  }

  #hasValidProof(txid: string, vins: Vin[]): boolean {
    for (const vin of vins) {
      if (vin.txid === txid) {
        return true;
      }
    }
    return false;
  }

  /*
   |--------------------------------------------------------------------------------
   | Parsers
   |--------------------------------------------------------------------------------
   */

  toJSON() {
    const response: any = this.data;

    response.cid = this.cid;
    response.time = this.time;
    response.ago = this.time.ago; // [TODO] Deprecate in favor of `time.ago`.
    response.value = this.value;
    response.order = this.order;

    if (this.status === "rejected") {
      response.reason = this.rejection;
    }

    if (this.status === "completed") {
      response.proof = this.proof;
    }

    if (this.status === "pending") {
      response.ordinals = this.vout?.ordinals ?? [];
      response.inscriptions = this.vout?.inscriptions ?? [];
    }

    return response;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type OfferContext = {
  /**
   * Network the orderbook is stored.
   */
  network: Network;

  /**
   * Orderbook address.
   */
  address: string;

  /**
   * Order transaction.
   */
  tx: Transaction;
};

type OfferStatus = "pending" | "rejected" | "completed";

type OfferTime = {
  offer: number;
  block: number;
  ago: string;
};
