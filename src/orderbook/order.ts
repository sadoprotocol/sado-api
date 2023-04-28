import moment from "moment";

import { Network } from "../libraries/network";
import { PriceList } from "../libraries/pricelist";
import { getTypeMap } from "../libraries/response";
import { getAddressVoutValue, hasOrdinalsAndInscriptions, parseLocation } from "../libraries/transaction";
import { infura, Order as IPFSOrder } from "../services/infura";
import { lookup, Transaction, Vout } from "../services/lookup";
import {
  InsufficientFundsException,
  InvalidOrderMakerException,
  InvalidOwnerLocationException,
  OrderResolvedExternallyException,
  OrdinalNotFoundException,
  VoutOutOfRangeException,
} from "./exceptions";
import { getOrderOwner, getOrderPrice } from "./utilities";

export class Order {
  status: OrderStatus = "pending";
  offers: OrderOffers = {
    count: 0,
    cids: [],
  };
  time: OrderTime;

  price?: PriceList;
  vout?: Vout;
  value?: number;
  rejection?: any;

  private constructor(readonly cid: string, readonly data: IPFSOrder, readonly context: OrderContext) {
    this.price = getOrderPrice(data);
    const blockTime = context.tx.blocktime * 1000;
    this.time = {
      order: data.ts,
      block: blockTime,
      ago: moment(blockTime).fromNow(),
    };
  }

  /*
   |--------------------------------------------------------------------------------
   | Factories
   |--------------------------------------------------------------------------------
   */

  static async from(cid: string, context: OrderContext): Promise<Order | undefined> {
    const data = await infura.getOrder(cid);
    if ("error" in data) {
      return undefined;
    }
    return new Order(cid, data, context);
  }

  /*
   |--------------------------------------------------------------------------------
   | Resolve
   |--------------------------------------------------------------------------------
   |
   | Order resolver goes through the initial order processing independent of the
   | orderbooks offer states. Here we check that the order has added required
   | listing fee, has a valid owner, and that the inscriptions are valid.
   |
   */

  async resolve(): Promise<void> {
    try {
      await this.#hasListingFee();
      await this.#hasValidOwner();
      await this.#hasInscriptions();
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

  async #hasValidOwner(): Promise<void> {
    const owner = await getOrderOwner(this.data, this.context.network);
    if (owner === undefined) {
      throw new InvalidOwnerLocationException(this.data.location);
    }
    if ((this.data.type === "sell" && owner === this.data.maker) === false) {
      throw new InvalidOrderMakerException(this.data.type, owner, this.data.maker);
    }
  }

  async #hasInscriptions(): Promise<void> {
    const [txid, voutN] = parseLocation(this.data.location);

    const tx = await lookup.transaction(txid, this.context.network);
    if (tx === undefined) {
      throw new OrdinalNotFoundException(txid, voutN);
    }

    const vout = (this.vout = tx.vout.find((item) => item.n === voutN));
    if (vout === undefined) {
      throw new VoutOutOfRangeException(voutN);
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Fulfill
   |--------------------------------------------------------------------------------
   |
   | Order fulfiller checks that the order has been fulfilled by checking that
   | the inscriptions have been removed from the vout, or the vout has been spent.
   | It also checks that one of the offers made is the fulfillment offer and
   | verifying its proof.
   |
   | Fulfillment requires the orderbook offers to be resolved before fulfillment
   | can me accurately made.
   |
   */

  async fulfill(): Promise<void> {
    try {
      if (this.vout === undefined) {
        return; // [TODO] Throw a rejection here: VoutHasNotBeenResolvedException
      }
      const hasInscriptions = hasOrdinalsAndInscriptions(this.vout);
      if (hasInscriptions === true) {
        return; // inscriptions are still present, order has not been fulfilled.
      }
      if (this.offers.count === 0) {
        throw new OrderResolvedExternallyException();
      }
      // [TODO] Validate that taker offer is valid
      this.status = "completed";
    } catch (err) {
      this.status = "rejected";
      this.rejection = err;
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Parsers
   |--------------------------------------------------------------------------------
   */

  toJSON() {
    const response: any = this.data;

    if (this.status === "rejected") {
      response.reason = this.rejection;
    }

    response.cid = this.cid;
    response.time = this.time;
    response.ago = this.time.ago; // [TODO] Deprecate this in favor of `time.ago`
    response.value = this.value;
    response.price = this.price;
    response.offers = this.offers;

    // ### Add Type Map
    // [TODO] Deprecate this if possible in favor of using the `type` field.

    const orderTypeMap = getTypeMap(this.data);
    response.buy = orderTypeMap.buy;
    response.sell = orderTypeMap.sell;

    // ### Add Ordinals & Inscriptions

    if (this.status === "pending") {
      response.ordinals = this.vout?.ordinals ?? [];
      response.inscriptions = this.vout?.inscriptions ?? [];
    }

    // ### Add Timestamp

    return response;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type OrderContext = {
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

type OrderStatus = "pending" | "rejected" | "completed";

type OrderTime = {
  order: number;
  block: number;
  ago: string;
};

type OrderOffers = {
  count: number;
  cids: string[];
};
