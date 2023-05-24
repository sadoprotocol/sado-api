import debug from "debug";
import { Document, MongoClient } from "mongodb";

import { config } from "../Config";

const log = debug("sado-mongo");

export const db = {
  connect,
  collection,
};

const client = new MongoClient(config.mongo.uri);

/**
 * Establishes a connection to the mongodb server and keeps it alive.
 */
async function connect() {
  client.on("close", connect);
  client
    .connect()
    .then(() => {
      log("client connected");
      createIndexes();
    })
    .catch(() => {
      log("client connection failed. Retrying...");
      setTimeout(connect, 1000);
    });
}

/**
 * Get a mongodb collection to perform query operations on.
 *
 * @param name - Name of the collection.
 */
function collection<T extends Document>(name: string) {
  return client.db(config.mongo.name).collection<T>(name);
}

async function createIndexes() {
  await collection("ipfs").createIndex({ cid: 1 }, { unique: true });
  await collection("notifications").createIndex({ cid: 1 }, { unique: true });
  await collection("transactions").createIndex({ txid: 1 }, { unique: true });
  await collection("orders").createIndex({ address: 1 });
  await collection("offers").createIndex({ address: 1 });
  await collection("worker").createIndex({ address: 1, network: 1 }, { unique: true });
  log("indexes created");
}

connect();
