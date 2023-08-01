import { envToNumber, getEnvironmentVariable } from "./Libraries/Environment";
import { DEFAULT_NETWORK } from "./Libraries/Network";

export const config = {
  api: {
    domain: getEnvironmentVariable("DOMAIN"),
    port: getEnvironmentVariable("PORT", envToNumber),
    token: getEnvironmentVariable("TOKEN"),
  },
  lookup: {
    endpoint: `https://${DEFAULT_NETWORK}.ordit.io/utxo`,
  },
  ipfs: {
    gateway: getEnvironmentVariable("IPFS_GATEWAY"),
    api: getEnvironmentVariable("IPFS_API"),
  },
  mongo: {
    hostname: getEnvironmentVariable("MONGO_HOSTNAME"),
    port: getEnvironmentVariable("MONGO_PORT", envToNumber),
    database: getEnvironmentVariable("MONGO_DATABASE"),
    username: getEnvironmentVariable("MONGO_USERNAME"),
    password: getEnvironmentVariable("MONGO_PASSWORD"),
  },
  slack: {
    webhook: getEnvironmentVariable("SLACK_WEBHOOK_URL"),
  },
};
