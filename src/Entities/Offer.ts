import moment from "moment";
import type { ObjectId, WithId } from "mongodb";

import { Network } from "../Libraries/Network";
import { PriceList } from "../Libraries/PriceList";
import { getAddressVoutValue, hasPendingOrdinals, hasSignature, parseLocation } from "../Libraries/Transaction";
import {
  InvalidOfferOwnerException,
  InvalidOwnerLocationException,
  InvalidSignatureException,
  OfferProofFailedException,
  OrdinalsMovedException,
  TransactionNotFoundException,
  VoutOutOfRangeException,
} from "../Orderbook/Exceptions";
import { getAskingPrice, getOrderOwner, getTakerTransaction } from "../Orderbook/Utilities";
import { infura, IPFSOffer, IPFSOrder } from "../Services/Infura";
import { lookup } from "../Services/Lookup";
import { db } from "../Services/Mongo";
import { Inscription, Ordinal, Transaction, Vin, Vout } from "./Transaction";

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
   * Vout containing the ordinals and inscription array.
   */
  vout?: Vout;

  /**
   * Transaction txid of the transaction that proves the offer is valid.
   */
  readonly proof?: string;

  /**
   * Rejection details about the offer and why it was rejected.
   */
  readonly rejection?: any;

  constructor(document: WithId<OfferDocument>) {
    this._id = document._id;
    this.status = document.status;
    this.address = document.address;
    this.tx = document.tx;
    this.order = document.order;
    this.offer = document.offer;
    this.value = document.value;
    this.time = document.time;
    this.vout = document.vout;
    this.proof = document.proof;
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
    const offer = await infura.getOffer(tx.cid);
    if ("error" in offer) {
      return;
    }
    const order = await infura.getOrder(offer.origin);
    if ("error" in order) {
      return;
    }
    await collection.insertOne(makePendingOffer(tx, order, offer));
  }

  static async getByAddress(address: string, network: Network): Promise<Offer[]> {
    const documents = await collection.find({ address, network }).toArray();
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

  /*
   |--------------------------------------------------------------------------------
   | Resolve
   |--------------------------------------------------------------------------------
   */

  async resolve(): Promise<void> {
    try {
      await this.#hasValidOffer();
      await this.#hasValidSignature();
      await this.#hasValidTransaction();
      await this.#hasCompleted();
    } catch (err) {
      await collection.updateOne({ _id: this._id }, { $set: { status: "rejected", rejection: err } });
    }
  }

  async #hasValidOffer(): Promise<void> {
    const owner = await getOrderOwner(this.order, this.tx.network);
    if (owner === undefined) {
      throw new InvalidOwnerLocationException(this.order.location);
    }
    if ((owner === this.order.maker || owner === this.offer.taker) === false) {
      throw new InvalidOfferOwnerException(owner, this.order.maker, this.offer.taker);
    }
  }

  async #hasValidSignature(): Promise<void> {
    if (hasSignature(this.offer.offer) === false) {
      throw new InvalidSignatureException();
    }
  }

  async #hasValidTransaction(): Promise<void> {
    const [txid, voutN] = parseLocation(this.order.location);
    const tx = await lookup.transaction(txid, this.tx.network);
    if (tx === undefined) {
      throw new TransactionNotFoundException(txid);
    }
    const vout = (this.vout = tx.vout.find((item) => item.n === voutN));
    if (vout === undefined) {
      throw new VoutOutOfRangeException(voutN);
    }
    await collection.updateOne({ _id: this._id }, { $set: { vout } });
  }

  async #hasCompleted(): Promise<void> {
    if (this.order.type === "sell") {
      const [txid] = parseLocation(this.order.location);
      const tx = await getTakerTransaction(txid, this.order, this.offer, this.tx.network);
      if (tx === undefined) {
        if (this.vout !== undefined && hasPendingOrdinals(this.vout) === true) {
          return;
        }
        throw new OrdinalsMovedException();
      }
      if (this.#hasValidProof(txid, tx.vin) === false) {
        throw new OfferProofFailedException();
      }
      return void collection.updateOne({ _id: this._id }, { $set: { status: "completed", proof: tx.txid } });
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

function makePendingOffer(tx: Transaction, order: IPFSOrder, offer: IPFSOffer): OfferDocument {
  return {
    address: tx.from,
    network: tx.network,
    status: "pending",
    order,
    offer,
    value: getAddressVoutValue(tx, tx.from),
    time: {
      block: tx.blocktime,
      offer: offer.ts,
    },
    tx,
  };
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
  vout?: Vout;
  proof?: string;
  rejection?: any;
};

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type OfferStatus = "pending" | "rejected" | "completed";

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
