import { envToNumber, getEnvironmentVariable } from "./Libraries/Environment";
import { DEFAULT_NETWORK } from "./Libraries/Network";

export const config = {
  port: getEnvironmentVariable("PORT", envToNumber),
  token: getEnvironmentVariable("TOKEN"),
  lookupEndpoint: `https://${DEFAULT_NETWORK}.ordit.io/utxo`,
  ipfsGateway: getEnvironmentVariable("IPFS_GATEWAY"),
  ipfsApi: getEnvironmentVariable("IPFS_API"),
  oceanEndpoint: getEnvironmentVariable("OCEAN_ENDPOINT"),
  mongo: {
    name: getEnvironmentVariable("MONGODB_NAME"),
    uri: getEnvironmentVariable("MONGODB_URI"),
  },
  slack: getEnvironmentVariable("SLACK_WEBHOOK_URL"),
};
