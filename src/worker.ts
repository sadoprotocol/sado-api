import debug from "debug";

import { getWorkers } from "./Collections/Worker";
import { resolveOrderbook } from "./Orderbook/Resolver";
import { utils } from "./Utilities";

const log = debug("sado-worker");

async function start() {
  log("resolving orderbooks");
  const limiter = utils.promise.limiter(10);
  const orderbooks = await getWorkers();
  for (const { address, network } of orderbooks) {
    limiter.push(() => resolveOrderbook(address, network));
  }
  await limiter.run();
  log("resolved orderbooks");
  process.exit(0);
}

start();
