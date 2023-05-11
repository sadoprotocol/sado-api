import { Queue } from "bullmq";

import { Network } from "../../Libraries/Network";
import { connection } from "./Connection";
import { WORKER_NAME } from "./Worker";

const PRIORITIES = {
  mainnet: 10,
  testnet: 7,
  regtest: 5,
} as const;

const queue = new Queue("orderbook", { connection });

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
    WORKER_NAME,
    { address, network },
    {
      jobId,
      priority: PRIORITIES[network],
      repeat: {
        every: 1000 * 60 * 5, // 5 minutes
      },
      removeOnFail: true,
      removeOnComplete: true,
    }
  );
}

function getJobId(address: string, network: Network) {
  return `${network}-${address}`;
}
