import { ipfs } from "../Services/IPFS";
import { db } from "../Services/Mongo";
import { IPFSCollection } from "./IPFS";

const collection = db.collection<IPFSCollection>("collections");

export async function addCollection(cid: string): Promise<void> {
  const document = await ipfs.getCollection(cid);
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
  await collection.deleteOne({ cid });
  await collection.insertOne(document);
}

export async function getCollections(): Promise<IPFSCollection[]> {
  const documents = await collection.find().toArray();
  return documents.map((document) => {
    delete (document as any)._id;
    return document;
  });
}

export async function getCollectionById(id: string): Promise<IPFSCollection | undefined> {
  const document = await collection.findOne({ id });
  if (document === null) {
    return undefined;
  }
  return document;
}
