import debug from "debug";

import { getWorkers } from "./Collections/Worker";
import { resolveOrderbook } from "./Orderbook/Resolver";

const log = debug("sado-worker");

async function start() {
  log("resolving orderbooks");
  const orderbooks = await getWorkers();
  for (const { address, network } of orderbooks) {
    try {
      await resolveOrderbook(address, network);
    } catch (error) {
      log(error.message);
    }
  }
  log("resolved orderbooks");
}

start();
