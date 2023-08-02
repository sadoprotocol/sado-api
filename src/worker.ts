import debug from "debug";

import { bootstrap } from "./Bootstrap";
import { getWorkers } from "./Models/Worker";
import { resolveOrderbook } from "./Orderbook/Resolver";
import { utils } from "./Utilities";

const log = debug("sado-worker");

async function start() {
  log("resolving orderbooks");

  await bootstrap();

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
