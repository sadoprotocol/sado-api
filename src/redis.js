"use strict"

const Redis = require('redis');

const redisClient = Redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect().then(() => {
  online = true;
  console.log('Redis client connected');
}).catch(() => {
  console.log('Redis is not installed. Cache will not be used..');
});

exports.set = set;
exports.get = get;

var online = false;

function set(params) {
  if (!online) return false;

  let expiration = params.expiration || false;
  let key = params.key || false;
  let data = params.data || false;

  if (!key || !data) {
    throw new Error("Expecting key and data.");
  }

  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }

  if (expiration) {
    redisClient.setEx(key, expiration, data);
  } else {
    redisClient.set(key, data);
  }
}

function get(params) {
  if (!online) return false;

  return new Promise((resolve, reject) => {
    let key = params.key || false;

    if (!key) {
      reject(new Error('Expecting key.'));
    } else {
      redisClient.get(key).then(data => {
        if (data !== null) {
          try {
            resolve(JSON.parse(data));
          } catch(err) {
            resolve(data);
          }
        } else {
          resolve(false);
        }
      }).catch(reject);
    }
  });
}

