import { ipfs } from "../Services/IPFS";
import { db } from "../Services/Mongo";
import { IPFSCollection } from "./IPFS";
import { Transaction } from "./Transaction";

const collection = db.collection<CollectionDocument>("collections");

export async function addCollection(tx: Transaction): Promise<void> {
  const document = await ipfs.getCollection(tx.cid);
  if ("error" in document) {
    return;
  }

  const banner = await ipfs.getImage(document.banner);
  if ("error" in banner) {
    return;
  }

  const cover = await ipfs.getImage(document.cover);
  if ("error" in cover) {
    return;
  }

  document.banner = banner.img;
  document.cover = cover.img;

  await collection.updateOne(
    { cid: tx.cid },
    {
      $set: {
        address: tx.from,
        network: tx.network,
        ...document,
      },
    },
    { upsert: true }
  );
}

export async function getCollections(address: string): Promise<CollectionDocument[]> {
  const documents = await collection.find({ address }).toArray();
  return documents.map((document) => {
    delete (document as any)._id;
    return document;
  });
}

export async function getCollectionById(id: string): Promise<CollectionDocument | undefined> {
  const document = await collection.findOne({ id });
  if (document === null) {
    return undefined;
  }
  return document;
}

type CollectionDocument = {
  address: string;
  network: string;
} & IPFSCollection;
