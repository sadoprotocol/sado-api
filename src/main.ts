import "./Methods/Offer";
import "./Methods/Order";
import "./Methods/Orderbook";
import "./Methods/Taproot";
import "./Methods/Transaction";

import debug from "debug";

import { config } from "./Config";
import { fastify } from "./Fastify";

const log = debug("sado-fastify");

const start = async () => {
  try {
    const address = await fastify.listen({ host: "0.0.0.0", port: config.port });
    log(`listening on ${address}`);
  } catch (err) {
    log(err);
    process.exit(1);
  }
};

start();
