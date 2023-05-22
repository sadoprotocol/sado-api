import "./Methods/Orderbook";
import "./Methods/Order";
import "./Methods/Offer";

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
