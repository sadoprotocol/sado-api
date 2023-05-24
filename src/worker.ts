import { Worker } from "bullmq";

import { config } from "./Config";
import { Network } from "./Libraries/Network";
import { resolveOrderbookTransactions } from "./Orderbook/Resolver";

const worker = new Worker<Data>(
  "orderbook",
  async ({ data: { address, network } }) => {
    await resolveOrderbookTransactions(address, network);
  },
  {
    concurrency: 5,
    connection: config.redis,
  }
);

worker.on("failed", (job) => {
  console.log("Orderbook Worker Failed", job); // TODO: Notify of failure on slack when notifications are implemented
});

type Data = {
  address: string;
  network: Network;
};
