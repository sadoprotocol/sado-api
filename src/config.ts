import { getEnvironmentVariable } from "./libraries/env";

export const config = {
  port: normalizePort(getEnvironmentVariable("PORT")),
  lookupEndpoint: "https://regtest.ordit.io/utxo",
  infuraGateway: getEnvironmentVariable("INFURA_GATEWAY"),
  redisUrl: getEnvironmentVariable("REDIS_URL"),
};

function normalizePort(val: string): number | string | boolean {
  const port = parseInt(val, 10);
  if (isNaN(port)) {
    return val; // named pipe
  }
  if (port >= 0) {
    return port; // port number
  }
  return false;
}
