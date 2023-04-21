import * as Redis from "redis";

let isOnline = false;

/*
 |--------------------------------------------------------------------------------
 | Redis Client
 |--------------------------------------------------------------------------------
 */

const redisClient = Redis.createClient({ url: process.env.REDIS_URL });

redisClient
  .connect()
  .then(() => {
    isOnline = true;
    console.log("Redis client connected");
  })
  .catch(() => {
    console.log("Redis is not installed. Cache will not be used..");
  });

/*
 |--------------------------------------------------------------------------------
 | Service
 |--------------------------------------------------------------------------------
 */

export const redis = {
  setData,
  getData,
};

/*
 |--------------------------------------------------------------------------------
 | Service Methods
 |--------------------------------------------------------------------------------
 */

async function setData({ key, data, expiration }: SetDataParams): Promise<void> {
  if (isOnline === false) {
    return;
  }
  const dataString = JSON.stringify(data);
  if (expiration !== undefined) {
    await redisClient.setEx(key, expiration, dataString);
  } else {
    await redisClient.set(key, dataString);
  }
}

async function getData<T extends Record<string, unknown>>(params: GetDataParams): Promise<T | undefined> {
  if (isOnline === false) {
    return;
  }
  if (!params.key) {
    throw new Error("Expecting key.");
  }
  const data = await redisClient.get(params.key);
  if (data !== null) {
    return JSON.parse(data);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type SetDataParams = {
  key: string;
  data: Record<string, unknown>;

  /**
   * Expiration in `seconds` for automatic deletion of the key.
   */
  expiration?: number;
};

type GetDataParams = {
  key: string;
};
