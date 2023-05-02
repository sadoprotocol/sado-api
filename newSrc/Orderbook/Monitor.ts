import Queue from "bull";
import debug from "debug";

import { config } from "../Config";
import { Network } from "../Libraries/Network";
import { resolveOrderbookTransactions } from "./Resolver";

const log = debug("sado-orderbook-monitor");
const queue = new Queue("orderbook", config.redisUrl);

export async function isMonitoring(address: string, network: Network): Promise<boolean> {
  const jobId = getJobId(address, network);
  const repeatableJobs = await queue.getRepeatableJobs();
  const hasJob = repeatableJobs.find((job) => job.id === jobId);
  if (hasJob === undefined) {
    return false;
  }
  return true;
}

export function monitorAddress(address: string, network: Network) {
  const jobId = getJobId(address, network);
  queue.add(
    { address, network },
    {
      jobId,
      repeat: {
        every: 1000 * 60 * 5, // 5 minutes
      },
      removeOnComplete: true,
    }
  );
}

function getJobId(address: string, network: Network) {
  return `${network}-${address}`;
}

queue.process(async ({ data: { address, network } }) => {
  log(`${network}: Resolving Orderbook ${address}`);
  await resolveOrderbookTransactions(address, network);
  log(`${network}: Resolved Orderbook ${address}`);
});
