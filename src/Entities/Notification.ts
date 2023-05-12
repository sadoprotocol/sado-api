import { db } from "../Services/Mongo";

export const collection = db.collection<Notification>("notifications");

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

export async function hasNotification(cid: string): Promise<boolean> {
  const tx = await collection.findOne({ cid });
  if (tx === null) {
    return false;
  }
  return true;
}

export async function cacheNotification(cid: string): Promise<void> {
  await collection.insertOne({ cid });
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type Notification = {
  cid: string;
};
