import moment from "moment";
import type { ObjectId, WithId } from "mongodb";

import { Network } from "../Libraries/Network";
import { PriceList } from "../Libraries/PriceList";
import { getTypeMap } from "../Libraries/Response";
import { getAddressVoutValue, getUTXOState, parseLocation } from "../Libraries/Transaction";
import {
  OrderFulfilledException,
  OrderInvalidMaker,
  OrderTransactionNotFound,
  OrderVoutNotFound,
  OrdinalsTransactedExternally,
} from "../Orderbook/Exceptions/OrderException";
import { getAskingPrice } from "../Orderbook/Utilities";
import { infura, IPFSOrder } from "../Services/Infura";
import { lookup } from "../Services/Lookup";
import { db } from "../Services/Mongo";
import { Offer } from "./Offer";
import { Inscription, Ordinal, Transaction, Vout } from "./Transaction";
import { getTransaction } from "./Transaction";

const collection = db.collection<OrderDocument>("orders");

export class Order {
  /**
   * MongoDB ObjectID.
   */
  readonly _id: ObjectId;

  /**
   * Status of the order.
   */
  status: OrderDocument["status"];

  /**
   * Address to the orderbook where the order is placed.
   */
  readonly address: string;

  /**
   * Transaction object as stored on the blockchain. We can store this statically
   * here since transaction data is immutable allowing for us to skip the blockchain
   * lookup.
   */
  readonly tx: Transaction;

  /**
   * Order object as stored on IPFS. We can store this statically here since order
   * data is immutable allowing for us to skip the IPFS lookup.
   */
  readonly order: IPFSOrder;

  /**
   * Amount of satoshis that goes back to the orderbook address in which the order
   * is placed.
   */
  value?: number;

  /**
   * Metadata about the offers that has been made against this order.
   */
  offers: OrderOffers;

  /**
   * Time details about the order and when it was created on the blockchain and
   * IPFS.
   */
  readonly time: OrderTime;

  /**
   * Vout containing the ordinals and inscription array.
   */
  vout?: Vout;

  /**
   * Rejection details if the order has been rejected.
   */
  rejection?: any;

  constructor(document: WithId<OrderDocument>) {
    this._id = document._id;
    this.status = document.status;
    this.address = document.address;
    this.tx = document.tx;
    this.order = document.order;
    this.value = document.value;
    this.offers = document.offers;
    this.time = document.time;
    this.vout = document.vout;
    this.rejection = document.rejection;
  }

  /*
  |--------------------------------------------------------------------------------
  | Factories
  |--------------------------------------------------------------------------------
  */

  static async insert(tx: Transaction): Promise<void> {
    const order = await infura.getOrder(tx.cid);
    if ("error" in order) {
      return;
    }
    await collection.insertOne(makePendingOrder(tx, order));
  }

  static async find(): Promise<Order[]> {
    const documents = await collection.find().toArray();
    return documents.map((document) => new Order(document));
  }

  static async getByAddress(address: string, network: Network): Promise<Order[]> {
    const documents = await collection.find({ address, network }).sort({ "time.block": -1 }).toArray();
    return documents.map((document) => new Order(document));
  }

  static async getByStatus(status: OrderStatus, address: string, network: Network): Promise<Order[]> {
    const documents = await collection.find({ status, address, network }).toArray();
    return documents.map((document) => new Order(document));
  }

  static async getByCID(cid: string): Promise<Order | undefined> {
    const document = await collection.findOne({ "order.cid": cid });
    if (document !== null) {
      return new Order(document);
    }
  }

  static async flush(address: string): Promise<void> {
    await collection.deleteMany({ address });
  }

  /*
   |--------------------------------------------------------------------------------
   | Resolve
   |--------------------------------------------------------------------------------
   */

  async resolve(): Promise<void> {
    try {
      const vout = await getOrdinalVout(this.order.location, this.order.maker, this.tx.network);
      await this.setVout(vout);

      // ### Offers
      // Update list of offers that has been made against this order.

      const offers = await getOffers(this.order.cid);
      await this.setOffers(offers);

      // ### Taker
      // Get the taker of the order if it has been fulfilled. If the order has not
      // been fulfilled, the taker will be undefined.

      const taker = await getTaker(this.order.location, this.offers, this.tx.network);
      if (taker !== undefined) {
        await this.setCompleted(taker);
      }
    } catch (error) {
      await this.setRejected(error);
    }
  }

  /*
  |--------------------------------------------------------------------------------
  | Mutators
  |--------------------------------------------------------------------------------
  */

  async setCompleted(taker: OrderTaker): Promise<void> {
    await collection.updateOne({ _id: this._id }, { $set: { status: "completed", "offers.taker": taker } });
    this.offers.taker = taker;
  }

  async setOffers(offers: OrderOffers): Promise<void> {
    await collection.updateOne({ _id: this._id }, { $set: { offers } });
    this.offers = offers;
  }

  async setVout(vout: Vout): Promise<void> {
    await collection.updateOne({ _id: this._id }, { $set: { vout } });
    this.vout = vout;
  }

  async setRejected(rejection: any): Promise<void> {
    await collection.updateOne({ _id: this._id }, { $set: { status: "rejected", rejection } });
    this.status = "rejected";
    this.rejection = rejection;
  }

  /*
   |--------------------------------------------------------------------------------
   | Parsers
   |--------------------------------------------------------------------------------
   */

  toJSON() {
    const orderTypeMap = getTypeMap(this.order);
    const response = {
      ...this.order,
      cid: this.order.cid,
      time: {
        ...this.time,
        ago: moment(this.time.block).fromNow(),
      },
      ago: moment(this.time.block).fromNow(), // [TODO] Deprecate in favor of `time.ago`.
      value: new PriceList(this.value ?? 0),
      price: new PriceList(getAskingPrice(this.order)),
      offers: this.offers,
      buy: orderTypeMap.buy,
      sell: orderTypeMap.sell,
      reason: undefined as string | undefined,
      ordinals: undefined as Ordinal[] | undefined,
      inscriptions: undefined as Inscription[] | undefined,
    };

    if (this.status === "pending") {
      response.ordinals = this.vout?.ordinals ?? [];
      response.inscriptions = this.vout?.inscriptions ?? [];
    }

    if (this.status === "rejected") {
      response.reason = this.rejection;
    }

    return response;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Validators
 |--------------------------------------------------------------------------------
 */

/**
 * Check if the ordinal transaction is owned by the maker of the order.
 *
 * @param location - Location of the ordinal transaction.
 * @param maker
 * @param network
 */
async function getOrdinalVout(location: string, maker: string, network: Network): Promise<Vout> {
  const [txid, n] = parseLocation(location);

  const tx = await getTransaction(txid, network);
  if (tx === undefined) {
    throw new OrderTransactionNotFound(location);
  }

  const vout = tx.vout[n];
  if (vout === undefined) {
    throw new OrderVoutNotFound(location);
  }

  if (vout.scriptPubKey.address !== maker) {
    throw new OrderInvalidMaker(location);
  }

  return vout;
}

/**
 * Get offers that has been made for the order with the given CID.
 *
 * @param cid - Order CID to retrieve offers for.
 *
 * @returns List of offers made for the order.
 */
async function getOffers(cid: string): Promise<OrderOffers> {
  const offers: OrderOffers = {
    count: 0,
    list: [],
  };
  const list = await Offer.getByOrderCID(cid);
  for (const offer of list) {
    offers.count += 1;
    offers.list.push({
      cid: offer.offer.cid,
      taker: offer.offer.taker,
    });
  }
  return offers;
}

/**
 * Check if the order has been completed. If so then we can mark the order as
 * completed.
 *
 * Check for completion by checking if the order has a confirmed offer taker
 * and validate the spent state of the transaction location defined on the
 * IPFS order.
 *
 * @param location - Location of the order ordinal transaction.
 */
async function getTaker(location: string, offers: OrderOffers, network: Network): Promise<OrderTaker | undefined> {
  const [txid, voutN] = parseLocation(location);
  const { address, spent } = await getUTXOState(txid, voutN, network);
  if (spent === true) {
    const tx = await getSpentTransaction(address, txid, network);
    if (tx !== undefined) {
      for (const utxo of tx.vout) {
        const offer = offers.list.find((offer) => offer.taker === utxo.scriptPubKey.address);
        if (offer !== undefined) {
          await setCompletedOffer(offers, offer.taker);
          return { address: offer.taker, location: `${tx.txid}:${utxo.n}` };
        }
      }
      throw new OrdinalsTransactedExternally(tx.txid);
    }
  }
}

async function getSpentTransaction(address: string, txid: string, network: Network): Promise<Transaction | undefined> {
  const txs = await lookup.transactions(address, network);
  for (const tx of txs) {
    for (const vin of tx.vin) {
      if (vin.txid === txid) {
        return tx;
      }
    }
  }
}

async function setCompletedOffer(offers: OrderOffers, address: string): Promise<void> {
  for (const { cid, taker } of offers.list) {
    const offer = await Offer.getByOfferCID(cid);
    if (taker === address) {
      await offer?.setCompleted();
    } else {
      await offer?.setRejected(new OrderFulfilledException());
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function makePendingOrder(tx: Transaction, order: IPFSOrder): OrderDocument {
  return {
    status: "pending",
    address: tx.from,
    network: tx.network,
    order,
    value: getAddressVoutValue(tx, tx.from),
    offers: {
      count: 0,
      list: [],
    },
    time: {
      block: tx.blocktime,
      order: order.ts,
    },
    tx,
  };
}

/*
 |--------------------------------------------------------------------------------
 | Document
 |--------------------------------------------------------------------------------
 */

type OrderDocument = {
  status: OrderStatus;
  address: string;
  network: Network;
  tx: Transaction;
  order: IPFSOrder;
  value?: number;
  offers: OrderOffers;
  time: OrderTime;
  vout?: Vout;
  rejection?: any;
};

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type OrderStatus = "pending" | "rejected" | "completed";

type OrderTime = {
  /**
   * Blocktime of the order transaction in seconds.
   */
  block: number;

  /**
   * Timestamp of the order object creation in the IPFS database.
   */
  order: number;
};

type OrderOffers = {
  count: number;
  list: {
    cid: string;
    taker: string;
  }[];
  taker?: OrderTaker;
};

type OrderTaker = {
  address: string;
  location: string;
};
