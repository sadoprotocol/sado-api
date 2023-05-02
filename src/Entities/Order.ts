import moment from "moment";
import type { ObjectId, WithId } from "mongodb";

import { Network } from "../Libraries/Network";
import { PriceList } from "../Libraries/PriceList";
import { getTypeMap } from "../Libraries/Response";
import { getAddressVoutValue, parseLocation } from "../Libraries/Transaction";
import {
  InvalidOrderMakerException,
  InvalidOwnerLocationException,
  OrdinalNotFoundException,
  OrdinalsMovedException,
  VoutOutOfRangeException,
} from "../Orderbook/Exceptions";
import { getAskingPrice, getOrderOwner } from "../Orderbook/Utilities";
import { infura, IPFSOrder } from "../Services/Infura";
import { lookup } from "../Services/Lookup";
import { db } from "../Services/Mongo";
import { addCollection } from "./Collections";
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
  readonly status: OrderDocument["status"];

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
  readonly value?: number;

  /**
   * Metadata about the offers that has been made against this order.
   */
  readonly offers: OrderOffers;

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
  readonly rejection?: any;

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
   | Accessors
   |--------------------------------------------------------------------------------
   */

  // ...

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
    await addCollection(tx.from, order);
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

  /*
  |--------------------------------------------------------------------------------
  | Mutators
  |--------------------------------------------------------------------------------
  */

  async setOffer(offer: Offer): Promise<void> {
    await collection.updateOne(
      {
        "order.cid": offer.order.cid,
        "offers.cids": { $ne: offer.offer.cid },
      },
      {
        $inc: { "offers.count": 1 },
        $push: { "offers.cids": offer.offer.cid },
      }
    );
  }

  /*
   |--------------------------------------------------------------------------------
   | Resolve
   |--------------------------------------------------------------------------------
   */

  async resolve(): Promise<void> {
    try {
      await this.#hasValidOwner();
      await this.#hasCompleted();
    } catch (err) {
      await collection.updateOne({ _id: this._id }, { $set: { status: "rejected", rejection: err } });
    }
  }

  async #hasValidOwner(): Promise<void> {
    const owner = await getOrderOwner(this.order, this.tx.network);
    if (owner === undefined) {
      throw new InvalidOwnerLocationException(this.order.location);
    }
    if ((this.order.type === "sell" && owner === this.order.maker) === false) {
      throw new InvalidOrderMakerException(this.order.type, owner, this.order.maker);
    }
  }

  async #hasCompleted(): Promise<void> {
    const list = await Offer.getByOrderCID(this.order.cid);

    // ### Set Offers Meta

    await collection.updateOne(
      {
        _id: this._id,
      },
      {
        $set: {
          "offers.count": list.length,
          "offers.cids": list.map((offer) => offer.offer.cid),
        },
      }
    );

    // ### Offer Proof Check
    // If order contains a connected offer with a valid proof the order is
    // considered completed.

    for (const offer of list) {
      if (offer.status === "completed" && offer.proof !== undefined) {
        return void collection.updateOne({ _id: this._id }, { $set: { status: "completed" } });
      }
    }

    // ### Inscription Check
    // Check if the inscription is still present on the expected transaction.
    // If not then the order is rejected since the inscriptions has been
    // moved independent of the order.

    await this.#hasInscriptions();
  }

  async #hasInscriptions(): Promise<void> {
    const [txid, voutN] = parseLocation(this.order.location);
    const tx = await lookup.transaction(txid, this.tx.network);
    if (tx === undefined) {
      throw new OrdinalNotFoundException(txid, voutN);
    }
    const vout = (this.vout = tx.vout.find((item) => item.n === voutN));
    if (vout === undefined) {
      throw new VoutOutOfRangeException(voutN);
    }
    if (vout.ordinals.length === 0) {
      throw new OrdinalsMovedException();
    }
    await collection.updateOne({ _id: this._id }, { $set: { vout } });
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
      cids: [],
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
  cids: string[];
};
