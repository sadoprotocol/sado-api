import { config } from "../../Config";

export const connection = {
  host: config.redis.host,
  port: config.redis.port,
};
