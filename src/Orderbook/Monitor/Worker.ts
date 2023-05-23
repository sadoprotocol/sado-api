import { Worker } from "bullmq";

import { Network } from "../../Libraries/Network";
import { resolveOrderbookTransactions } from "../Resolver";
import { connection } from "./Connection";

export const WORKER_NAME = "orderbook";

const worker = new Worker<Data>(
  WORKER_NAME,
  async ({ data: { address, network } }) => {
    await resolveOrderbookTransactions(address, network);
  },
  {
    concurrency: 5,
    connection,
  }
);

worker.on("failed", (job) => {
  console.log("Orderbook Worker Failed", job); // TODO: Notify of failure on slack when notifications are implemented
});

type Data = {
  address: string;
  network: Network;
};
