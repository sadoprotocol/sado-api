import debug from "debug";

import { getWorkers } from "./Entities/Worker";
import { resolveOrderbook } from "./Orderbook/Resolver";

const log = debug("sado-worker");

async function start() {
  log("Resolving orderbooks");
  const orderbooks = await getWorkers();
  for (const { address, network } of orderbooks) {
    try {
      await resolveOrderbook(address, network);
    } catch (error) {
      log(error.message);
    }
  }
  log("Resolved orderbooks");
}

start();
