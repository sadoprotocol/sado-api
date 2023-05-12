import { envToNumber, getEnvironmentVariable } from "./Libraries/Environment";
import { DEFAULT_NETWORK } from "./Libraries/Network";

export const config = {
  port: normalizePort(getEnvironmentVariable("PORT")),
  lookupEndpoint: `https://${DEFAULT_NETWORK}.ordit.io/utxo`,
  infuraGateway: getEnvironmentVariable("INFURA_GATEWAY"),
  oceanEndpoint: getEnvironmentVariable("OCEAN_ENDPOINT"),
  redis: {
    host: getEnvironmentVariable("REDIS_HOST"),
    port: getEnvironmentVariable("REDIS_PORT", envToNumber),
  },
  mongo: {
    name: getEnvironmentVariable("MONGODB_NAME"),
    uri: getEnvironmentVariable("MONGODB_URI"),
  },
  slack: getEnvironmentVariable("SLACK_WEBHOOK_URL"),
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
