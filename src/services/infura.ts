import fetch from "node-fetch";

import { config } from "../config";
import { makeObjectKeyChecker } from "../libraries/object";
import { redis } from "./redis";

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

async function getOrder(cid: string): Promise<InfuraResponse<Order>> {
  const data = await get<Order>(cid);
  if (data === undefined) {
    return errorResponse(`Order CID '${cid}' not found`);
  }
  if (hasValidOrderKeys(data) === false) {
    return errorResponse(`Malformed CID '${cid}', order missing required keys`, data);
  }
  return successResponse(data);
}

async function getOffer(cid: string): Promise<InfuraResponse<Offer>> {
  const data = await get<Offer>(cid);
  if (data === undefined) {
    return errorResponse(`Offer CID '${cid}' not found`);
  }
  if (hasValidOfferKeys(data) === false) {
    return errorResponse(`Malformed CID '${cid}', offer missing required keys`, data);
  }
  return successResponse(data);
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function get<Data extends Order | Offer>(cid: string): Promise<Data | undefined> {
  const cachedData = await redis.getData<Data>({ key: cid });
  if (cachedData) {
    return cachedData;
  }
  const response = await fetch(config.infuraGateway + "/ipfs/" + cid, FETCH_REQUEST_DEFAULTS);
  if (response.status === 200) {
    const data = await response.json();
    void redis.setData({ key: cid, data });
    return data;
  }
}

function successResponse<Data extends Order | Offer>(data: Data): InfuraResponse<Data> {
  return data;
}

function errorResponse(error: string, data = {}): InfuraResponse<any> {
  return { error, data };
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type InfuraResponse<Data extends Order | Offer> =
  | Data
  | {
      error: string;
      data: any;
    };

/**
 * Order is created by either a seller or buyer.
 *
 * ### SELL
 *
 * A sell order who wants to sell or trade their ordinals/inscriptions. A sell
 * order can contain either `satoshis` or `cardinals` representing the minimum
 * amount they want to sell for. Or it can contain a `satoshi` which represents
 * a specific transaction at a vout location that they want to execute a trade
 * for.
 *
 * In the case of a trade the `location` represents the location which they
 * want to give. And the `satoshi` represents the location they want to receive.
 *
 * ### BUY
 *
 * A buy order who wants to buy or trade ordinals/inscriptions. A buy order can
 * contain either `satoshis` or `cardinals` representing the amount that they
 * wish to buy for. Or it can contain a `satoshi` which represents a specific
 * transaction at a vout location that they want to trade for.
 *
 * In the case of a trade the `location` represents the location which they
 * wish to give, and the `satoshi` represents the location they want to receive.
 *
 * ### VALIDATION
 *
 *  - An order must have one of [satoshis | cardinals | satoshi].
 */
export type Order<Meta extends Record<string, unknown> = Record<string, unknown>> = {
  /**
   * Timestamp to act as nonce.
   *
   * Note that this timestamp value may not be the actual
   * timestamp for when the order was created. To get the sourced timestamp
   * you need to check timestamp value on the blockchain transaction.
   */
  ts: number;

  /**
   * Order type.
   */
  type: OrderType;

  /**
   * Location of ordinal being sold in the format `txid:vout`.
   */
  location: string;

  /**
   * Address of the maker correlating to key used in signature.
   *
   * A maker address can be one of two types, a `legacy` or `bech32`. This is defined by
   * the maker when they create their wallet.
   *
   * NOTE! When a maker address is a `bech32` address then a `desc` field is required.
   */
  maker: string;

  /**
   * Amount of satoshis required/offered to execute the fulfill the order.
   *
   * SELL - Integer number of lowest denomination required to purchase the ordinal.
   * BUY  - Integer number offered to purchase the ordinal.
   *
   * @deprecated this value is slated to be removed in favor of `cardinals`.
   */
  satoshis?: string;

  /**
   * Amount of satoshis required/offered to execute the fulfill the order.
   *
   * SELL - Integer number of lowest denomination required to purchase the ordinal.
   * BUY  - Integer number offered to purchase the ordinal.
   */
  cardinals?: number;

  /**
   * Satoshi is used when a seller or buyer wants to trade inscriptions.
   * Location of the transaction the seller or buyer wishes to receive.
   */
  satoshi?: string;

  /**
   * List of addresses that are allowed to take this order.
   */
  orderbooks?: string[];

  /**
   * Metadata attached to the order.
   */
  meta?: Meta;

  /**
   * Signature.
   */
  signature: string;

  /**
   * Descriptor for BECH32 addresses.
   * NOTE! This is required if the maker is using a BECH32 address.
   */
  desc?: string;
};

export type Offer = {
  /**
   * Timestamp to act as nonce.
   *
   * Note that this timestamp value may not be the actual timestamp for
   * when the order was created. To get the sourced timestamp you need
   * to check timestamp value on the blockchain transaction.
   */
  ts: number;

  /**
   * IPFS (Inter Planetary File System) CID of original order.
   */
  origin: string;

  /**
   * PSBT (Partially Signed BTC Transaction)
   *
   * An offer is a partially signed transaction that is signed by either
   * a seller or buyer.
   *
   * Once a offer has been signed by both parties it is then considered a
   * completed transaction once its been relayed to the network.
   */
  offer: string;

  /**
   * Address of the taker correlating to key used in signature.
   *
   * For a offer to be valid it needs to be signed by the taker before
   * its relayed to the network.
   */
  taker: string;

  /**
   * Signature of signing the JSON string with the takers private key.
   */
  signature: string;

  /**
   * Descriptor for BECH32 addresses.
   * NOTE! This is required if the taker is using a BECH32 address.
   */
  desc?: string;
} & OfferPartial;

/**
 * Offer partial is defines mutated fields of an offer used during the
 * orderbook build process.
 *
 * [TODO] Find a better implementation for this during continued
 *        orderbook development.
 */
type OfferPartial = {
  order?: Order;
};

export type OrderType = "sell" | "buy";
