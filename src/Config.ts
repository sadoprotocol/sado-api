import { envToNumber, getEnvironmentVariable } from "./Libraries/Environment";
import { DEFAULT_NETWORK } from "./Libraries/Network";

export const config = {
  port: getEnvironmentVariable("PORT", envToNumber),
  lookupEndpoint: `https://${DEFAULT_NETWORK}.ordit.io/utxo`,
  ipfsGateway: getEnvironmentVariable("IPFS_GATEWAY"),
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
