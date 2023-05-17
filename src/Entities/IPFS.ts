import { db } from "../Services/Mongo";

export const collection = db.collection<IPFSDocument>("ipfs");

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

export async function setIPFS(document: IPFSDocument): Promise<void> {
  await collection.insertOne(document);
}

export async function getIPFS(cid: string): Promise<IPFSDocument | undefined> {
  const document = await collection.findOne({ cid });
  if (document === null) {
    return undefined;
  }
  delete (document as any)._id;
  return document;
}

/*
 |--------------------------------------------------------------------------------
 | Document
 |--------------------------------------------------------------------------------
 */

type IPFSDocument = IPFSOrder | IPFSOffer;

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
export type IPFSOrder = {
  cid: string;

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
  cardinals?: string;

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
  meta?: Record<string, unknown>;

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

export type IPFSOffer = {
  cid: string;

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
   * Order the offer is being made for. This is used by the SADO API
   * process and response.
   */
  order: IPFSOrder;

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
   * Format in which the offer is encoded.
   */
  offer_format?: string;

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
  signature?: string;

  /**
   * Descriptor for BECH32 addresses.
   * NOTE! This is required if the taker is using a BECH32 address.
   */
  desc?: string;
};

export type OrderType = "sell" | "buy";
