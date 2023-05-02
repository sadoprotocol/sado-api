import { getEnvironmentVariable } from "./Libraries/Environment";

export const config = {
  port: normalizePort(getEnvironmentVariable("PORT")),
  lookupEndpoint: "https://regtest.ordit.io/utxo",
  infuraGateway: getEnvironmentVariable("INFURA_GATEWAY"),
  oceanEndpoint: getEnvironmentVariable("OCEAN_ENDPOINT"),
  redisUrl: getEnvironmentVariable("REDIS_URL"),
  mongo: {
    name: getEnvironmentVariable("MONGODB_NAME"),
    uri: getEnvironmentVariable("MONGODB_URI"),
  },
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
