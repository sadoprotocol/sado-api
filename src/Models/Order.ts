import moment from "moment";
import type { Filter, ObjectId, WithId } from "mongodb";

import {
  OrderFulfilledException,
  OrderInvalidMaker,
  OrderTransactionNotFound,
  OrderVoutNotFound,
  OrdinalsTransactedExternally,
} from "../Exceptions/OrderException";
import { Network } from "../Libraries/Network";
import { PriceList } from "../Libraries/PriceList";
import { getTypeMap } from "../Libraries/Response";
import { ipfs } from "../Services/IPFS";
import { Lookup } from "../Services/Lookup";
import { db } from "../Services/Mongo";
import { utils } from "../Utilities";
import { IPFSOrder } from "./IPFS";
import { Offer } from "./Offer";
import { Inscription, Ordinal, Transaction, Vout } from "./Transaction";

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

  static async insert(tx: Transaction): Promise<Order | undefined> {
    const order = await ipfs.getOrder(tx.cid);
    if ("error" in order) {
      return;
    }
    const result = await collection.insertOne(makePendingOrder(tx, order));
    if (result.acknowledged === true) {
      return this.findById(result.insertedId);
    }
  }

  static async query(filter: Filter<OrderDocument>): Promise<Order[]> {
    const documents = await collection.find(filter).toArray();
    return documents.map((document) => new Order(document));
  }

  static async find(): Promise<Order[]> {
    const documents = await collection.find().toArray();
    return documents.map((document) => new Order(document));
  }

  static async findById(_id: ObjectId): Promise<Order | undefined> {
    const document = await collection.findOne({ _id });
    if (document !== null) {
      return new Order(document);
    }
  }

  static async getByAddress(address: string, network: Network, filter: Filter<OrderDocument> = {}): Promise<Order[]> {
    const documents = await collection
      .find({ address, network, ...filter })
      .sort({ "time.block": -1 })
      .toArray();
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
   | Methods
   |--------------------------------------------------------------------------------
   */

  async getInscriptions(lookup: Lookup): Promise<Inscription[]> {
    return getOrdinalVout(this.order.location, this.order.maker, lookup)
      .then((vout) => vout.inscriptions)
      .catch(() => []);
  }

  /*
   |--------------------------------------------------------------------------------
   | Resolve
   |--------------------------------------------------------------------------------
   */

  async resolve(lookup: Lookup): Promise<void> {
    try {
      const vout = await getOrdinalVout(this.order.location, this.order.maker, lookup);
      await this.setVout(vout);

      // ### Offers
      // Update list of offers that has been made against this order.

      const offers = await getOffers(this.order.cid);
      await this.setOffers(offers);

      // ### Taker
      // Get the taker of the order if it has been fulfilled. If the order has not
      // been fulfilled, the taker will be undefined.

      const taker = await getTaker(this.order.location, this.offers, lookup);
      if (taker !== undefined) {
        await this.setCompleted(taker);
      }
    } catch (error) {
      if (error instanceof OrderTransactionNotFound) {
        return; // TODO: Add better handling of this, as this can be because of a bad network lookup.
      }
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
    await Offer.setVout(this.order.cid, vout);
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
      price: new PriceList(utils.order.getPrice(this.order)),
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
 * @param maker    - Address of the maker of the order.
 * @param lookup   - Lookup instance to use for network lookups.
 */
async function getOrdinalVout(location: string, maker: string, lookup: Lookup): Promise<Vout> {
  const [txid, n] = utils.parse.location(location);

  const tx = await lookup.getTransaction(txid);
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
async function getTaker(location: string, offers: OrderOffers, lookup: Lookup): Promise<OrderTaker | undefined> {
  const [txid, voutN] = utils.parse.location(location);
  const { address, spent } = await utils.utxo.getSpentState(txid, voutN, lookup);
  if (spent === true) {
    const tx = await getSpentTransaction(address, txid, lookup);
    if (tx !== undefined) {
      for (const utxo of tx.vout) {
        const offer = offers.list.find((offer) => offer.taker === utxo.scriptPubKey.address);
        if (offer !== undefined) {
          await setCompletedOffer(tx.txid, offers, offer.taker);
          return { address: offer.taker, location: `${tx.txid}:${utxo.n}` };
        }
      }
      throw new OrdinalsTransactedExternally(tx.txid);
    }
  }
}

async function getSpentTransaction(address: string, txid: string, lookup: Lookup): Promise<Transaction | undefined> {
  const txs = await lookup.getTransactions(address);
  for (const tx of txs) {
    for (const vin of tx.vin) {
      if (vin.txid === txid) {
        return tx;
      }
    }
  }
}

async function setCompletedOffer(txid: string, offers: OrderOffers, address: string): Promise<void> {
  for (const { cid, taker } of offers.list) {
    const offer = await Offer.getByOfferCID(cid);
    if (taker === address) {
      await offer?.setCompleted(txid);
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
    value: utils.transaction.getAddressOutputValue(tx, tx.from),
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

export type OrderStatus = "pending" | "rejected" | "completed";

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
