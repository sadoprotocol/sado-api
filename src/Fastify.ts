import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import createError from "http-errors";

import { api } from "./Api";
import { DEFAULT_NETWORK, Network } from "./Libraries/Network";
import { Orderbook } from "./Orderbook/Orderbook";

export const fastify = Fastify();

fastify.register(cors);
fastify.register(helmet);
fastify.register(api.fastify);

// [TODO] Deprecate this endpoint in favor of more granular endpoints
fastify.all<{
  Body: {
    address: string;
    network?: Network;
  };
}>("/get", async function (request) {
  if (request.body && request.body.address) {
    const orderbook = new Orderbook(request.body.address, { network: request.body.network ?? DEFAULT_NETWORK });
    return {
      success: true,
      message: `Orderbook of ${request.body.address}`,
      rdata: await orderbook.fetch(),
    };
  }
  return createError(416, "Expecting address key value");
});
