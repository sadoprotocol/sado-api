import { WithId } from "mongodb";

import { Network } from "../Libraries/Network";
import { mongo } from "../Services/Mongo";

export const collection = mongo.db.collection<WorkerDocument>("workers");

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

export async function hasWorker(address: string, network: Network): Promise<boolean> {
  return (await collection.findOne({ address, network })) !== null;
}

export async function addWorker(address: string, network: Network): Promise<void> {
  await collection.updateOne({ address }, { $set: { address, network } }, { upsert: true });
}

export async function getWorkers(): Promise<WithId<WorkerDocument>[]> {
  return collection.find().toArray();
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type WorkerDocument = {
  address: string;
  network: Network;
};
