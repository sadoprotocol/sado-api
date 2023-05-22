import moment from "moment";
import type { Filter, ObjectId, WithId } from "mongodb";

import { Network } from "../Libraries/Network";
import { PriceList } from "../Libraries/PriceList";
import { getAddressVoutValue } from "../Libraries/Transaction";
import { IPFSLookupFailed } from "../Orderbook/Exceptions/GeneralExceptions";
import { getAskingPrice, utils } from "../Orderbook/Utilities";
import { validator } from "../Orderbook/Validator";
import { ipfs } from "../Services/IPFS";
import { Lookup } from "../Services/Lookup";
import { db } from "../Services/Mongo";
import { IPFSOffer, IPFSOrder } from "./IPFS";
import { Inscription, Ordinal, Transaction, Vout } from "./Transaction";

const collection = db.collection<OfferDocument>("offers");

export class Offer {
  /**
   * MongoDB ObjectID.
   */
  readonly _id: ObjectId;

  /**
   * Status of the offer.
   */
  readonly status: OfferStatus;

  /**
   * Address to the orderbook where the offer is placed.
   */
  readonly address: string;

  /**
   * Transaction object as stored on the blockchain. We can store this statically
   * here since transaction data is immutable allowing for us to skip the blockchain
   * lookup.
   */
  readonly tx: Transaction;

  /**
   * IPFS object for the order associated with the offer transaction.
   */
  readonly order: IPFSOrder;

  /**
   * IPFS object of the offer.
   */
  readonly offer: IPFSOffer;

  /**
   * Amount of satoshis that goes back to the orderbook address in which the offer
   * is placed.
   */
  readonly value?: number;

  /**
   * Time details about the offer and when it was created on the blockchain and
   * IPFS.
   */
  readonly time: OfferTime;

  /**
   * Estimated fee in satoshis for the offer transaction.
   */
  readonly fee?: number;

  /**
   * Vout containing the ordinals and inscription array.
   */
  vout?: Vout;

  /**
   * Transaction txid of the transaction that proves the offer is valid.
   */
  proof?: string;

  /**
   * Rejection details about the offer and why it was rejected.
   */
  rejection?: any;

  constructor(document: WithId<OfferDocument>) {
    this._id = document._id;
    this.status = document.status;
    this.address = document.address;
    this.tx = document.tx;
    this.order = document.order;
    this.offer = document.offer;
    this.value = document.value;
    this.time = document.time;
    this.fee = document.fee;
    this.vout = document.vout;
    this.proof = document.proof;
    this.rejection = document.rejection;
  }

  /*
  |--------------------------------------------------------------------------------
  | Factories
  |--------------------------------------------------------------------------------
  */

  static async insert(tx: Transaction, lookup: Lookup): Promise<Offer | undefined> {
    const offer = await ipfs.getOffer(tx.cid);
    if ("error" in offer) {
      await collection.insertOne(makeRejectedOffer(tx, new IPFSLookupFailed(tx.txid, offer.error, offer.data)));
      return;
    }
    const order = await ipfs.getOrder(offer.origin);
    if ("error" in order) {
      await collection.insertOne(makeRejectedOffer(tx, new IPFSLookupFailed(tx.txid, order.error, order.data), offer));
      return;
    }
    const fee = await getTransactioFee(offer.offer, lookup);
    const result = await collection.insertOne(makePendingOffer(tx, order, offer, fee));
    if (result.acknowledged === true) {
      return this.findById(result.insertedId);
    }
  }

  static async query(filter: Filter<OfferDocument>): Promise<Offer[]> {
    const documents = await collection.find(filter).toArray();
    return documents.map((document) => new Offer(document));
  }

  static async findById(_id: ObjectId): Promise<Offer | undefined> {
    const document = await collection.findOne({ _id });
    if (document !== null) {
      return new Offer(document);
    }
  }

  static async setVout(cid: string, vout: Vout): Promise<void> {
    await collection.updateMany({ "order.cid": cid }, { $set: { vout } });
  }

  static async getByAddress(address: string, network: Network, filter: Filter<OfferDocument> = {}): Promise<Offer[]> {
    const documents = await collection
      .find({ address, network, ...filter })
      .sort({ "time.block": -1 })
      .toArray();
    return documents.map((document) => new Offer(document));
  }

  static async getByStatus(status: OfferStatus, address: string, network: Network): Promise<Offer[]> {
    const documents = await collection.find({ status, address, network }).toArray();
    return documents.map((document) => new Offer(document));
  }

  static async getByOfferCID(cid: string): Promise<Offer | undefined> {
    const document = await collection.findOne({ "offer.cid": cid });
    if (document !== null) {
      return new Offer(document);
    }
  }

  static async getByOrderCID(cid: string): Promise<Offer[]> {
    const documents = await collection.find({ "order.cid": cid }).toArray();
    return documents.map((document) => new Offer(document));
  }

  static async flush(address: string): Promise<void> {
    await collection.deleteMany({ address });
  }

  /*
   |--------------------------------------------------------------------------------
   | Resolve
   |--------------------------------------------------------------------------------
   */

  async resolve(lookup: Lookup): Promise<void> {
    try {
      await validator.offer.validate(this.offer, this.order, lookup);
    } catch (error) {
      await this.setRejected(error);
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Mutators
   |--------------------------------------------------------------------------------
   */

  async setCompleted(proof: string): Promise<void> {
    await collection.updateOne({ _id: this._id }, { $set: { status: "completed", proof } });
    this.proof = proof;
  }

  async setRejected(rejection: any): Promise<void> {
    await collection.updateOne({ _id: this._id }, { $set: { status: "rejected", rejection } });
    this.rejection = rejection;
  }

  /*
   |--------------------------------------------------------------------------------
   | Parsers
   |--------------------------------------------------------------------------------
   */

  toJSON() {
    const response = {
      ...this.offer,
      cid: this.offer.cid,
      time: {
        block: this.tx.blocktime,
        offer: this.offer.ts,
        ago: moment(this.tx.blocktime).fromNow(),
      },
      ago: moment(this.tx.blocktime).fromNow(), // [TODO] Deprecate in favor of `time.ago`.
      value: new PriceList(this.value),
      fee: new PriceList(this.fee),
      order: {
        ...this.order,
        price: new PriceList(getAskingPrice(this.order)),
      },
      reason: undefined as string | undefined,
      proof: undefined as string | undefined,
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

    if (this.status === "completed") {
      response.proof = this.proof;
    }

    return response;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function makePendingOffer(tx: Transaction, order: IPFSOrder, offer: IPFSOffer, fee?: number): OfferDocument {
  return {
    status: "pending",
    address: tx.from,
    network: tx.network,
    order,
    offer,
    value: getAddressVoutValue(tx, tx.from),
    time: {
      block: tx.blocktime,
      offer: offer.ts,
    },
    fee,
    tx,
  };
}

function makeRejectedOffer(tx: Transaction, rejection: any, offer?: IPFSOffer): any {
  return {
    status: "rejected",
    address: tx.from,
    network: tx.network,
    offer,
    value: getAddressVoutValue(tx, tx.from),
    time: {
      block: tx.blocktime,
      offer: 0,
    },
    tx,
    rejection,
  };
}

async function getTransactioFee(offer: string, lookup: Lookup): Promise<number | undefined> {
  const psbt = utils.psbt.decode(offer);
  if (psbt === undefined) {
    return undefined;
  }
  return utils.psbt.getFee(psbt, lookup);
}

/*
 |--------------------------------------------------------------------------------
 | Document
 |--------------------------------------------------------------------------------
 */

type OfferDocument = {
  status: OfferStatus;
  address: string;
  network: Network;
  tx: Transaction;
  order: IPFSOrder;
  offer: IPFSOffer;
  value?: number;
  time: OfferTime;
  fee?: number;
  vout?: Vout;
  proof?: string;
  rejection?: any;
};

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type OfferStatus = "pending" | "rejected" | "completed";

type OfferTime = {
  /**
   * Blocktime of the offer transaction in seconds.
   */
  block: number;

  /**
   * Timestamp of the offer object creation in the IPFS database.
   */
  offer: number;
};
