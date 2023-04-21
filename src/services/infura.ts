import fetch from "node-fetch";

import { config } from "../config";
import { makeObjectKeyChecker } from "../libraries/are-keys-present";
import { redis } from "./redis";

const ONE_DAY = 60 * 60 * 24;
const FETCH_REQUEST_DEFAULTS = {
  method: "GET",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
};

const hasValidOrderKeys = makeObjectKeyChecker(["ts", "type", "maker", "location", "signature"]);
const hasValidOfferKeys = makeObjectKeyChecker(["ts", "origin", "taker", "offer", "signature"]);

/*
 |--------------------------------------------------------------------------------
 | Infura
 |--------------------------------------------------------------------------------
 */

export const infura = {
  getOrder,
  getOffer,
};

/*
 |--------------------------------------------------------------------------------
 | Service Methods
 |--------------------------------------------------------------------------------
 */

async function getOrder(cid: string): Promise<Order | undefined> {
  const cachedData = await redis.getData<Order>({ key: cid });
  if (cachedData) {
    return cachedData;
  }
  const data = await get(cid);
  if (data !== undefined && hasValidOrderKeys(data)) {
    void redis.setData({ key: cid, data, expiration: ONE_DAY });
    return data;
  }
}

async function getOffer(cid: string): Promise<Offer | undefined> {
  const cachedData = await redis.getData<Offer>({ key: cid });
  if (cachedData) {
    return cachedData;
  }
  const data = await get(cid);
  if (data !== undefined && hasValidOfferKeys(data)) {
    void redis.setData({ key: cid, data, expiration: ONE_DAY });
    return data;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function get(cid: string): Promise<any | undefined> {
  const response = await fetch(config.infuraGateway + "/ipfs/" + cid, FETCH_REQUEST_DEFAULTS);
  if (response.status === 200) {
    return response.json();
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type Order<Meta extends Record<string, unknown> = Record<string, unknown>> = {
  /**
   * Order timestamp.
   *
   * Note that this timestamp value may not be the actual
   * timestamp for when the order was created. To get the sourced timestamp
   * you need to check timestamp value on the blockchain transaction.
   */
  ts: number;

  /**
   * Order type.
   */
  type: "sell" | "buy";

  /**
   * Address to the location of the ordinal.
   */
  location: string;

  /**
   * Address of the maker.
   */
  maker: string;

  /**
   * Amount of satoshis that the maker is willing to pay.
   */
  satoshis?: string;

  /**
   * [TODO] Refresh on what this value is...
   */
  satoshi?: string;

  /**
   * [TODO] Refresh out what this value is...
   */
  cardinals?: number;

  /**
   * List of addresses that are allowed to take this order.
   */
  orderbooks: string[];

  /**
   * Metadata attached to the order.
   */
  meta: Meta;

  /**
   * Legacy Signature?
   * [TODO] Clarify the signature format.
   */
  signature: string;

  /**
   * Signature of the order.
   * [TODO] Clarify the signature format.
   */
  desc?: string;
};

export type Offer = {
  /**
   * Offer timestamp.
   *
   * Note that this timestamp value may not be the actual
   * timestamp for when the order was created. To get the sourced timestamp
   * you need to check timestamp value on the blockchain transaction.
   */
  ts: number;

  /**
   * Origin CID of the order that this offer is for.
   */
  origin: string;

  /**
   * [TODO] Investigate meaning of this value...
   */
  offer: string;

  /**
   * Address making the offer.
   */
  taker: string;

  /**
   * Offer signature.
   */
  signature: string;

  /**
   * Resolved order linked to this offer.
   */
  order?: Order;
};
