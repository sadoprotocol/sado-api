import { mongo } from "../Services/Mongo";

export const collection = mongo.db.collection<IPFSDocument>("ipfs");

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

export async function setIPFS(document: IPFSDocument): Promise<void> {
  await collection.updateOne({ cid: document.cid }, { $set: document }, { upsert: true });
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

type IPFSDocument = IPFSOrder | IPFSOffer | IPFSCollection | IPFSImage;

export type IPFSOrder = {
  cid: string;
  ts: number;
  type: OrderType;
  location: string;
  maker: string;
  cardinals: number;
  instant?: string;
  expiry?: number;
  satoshi?: number;
  meta?: Record<string, unknown>;
  orderbooks?: string[];
  signature: string;
  signature_format?: string;
  desc?: string;
  pubkey?: string;
};

export type IPFSOffer = {
  cid: string;
  ts: number;
  origin: string;
  order: IPFSOrder;
  offer: string;
  offer_format?: string;
  taker: string;
};

export type IPFSCollection = {
  cid: string;
  id: string;
  owner: string;
  name: string;
  title: string;
  intro: string;
  description: string;
  cover: string;
  banner: string;
};

export type IPFSImage = {
  cid: string;
  img: string;
};

export type OrderType = "sell" | "buy";
