"use strict"

const fetch = require("node-fetch"); // Remove if you are using Node 18 above.
const endpoint = process.env.LOOKUP_ENDPOINT;

exports.transactions = transactions;
exports.transaction = transaction;
exports.balance = balance;
exports.unspents = unspents;


async function transactions(address) {
  return await get('/transactions', { address });
}

async function transaction(txid) {
  return await get('/transaction', { txid });
}

async function balance(address) {
  return await get('/balance', { address });
}

async function unspents(address) {
  return await get('/unspents', { address });
}

// ===

function get(path, data = false) {
  if (path.indexOf('/') !== 0) {
    path = '/' + path;
  }

  let url = endpoint + path;

  let requestObject = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    requestObject.body = JSON.stringify(data);
    requestObject.method = 'POST';
  }

  return new Promise(resolve => {
    fetch (url, requestObject)
      .then(response => response.json())
      .then(response => {
        if (response.success && response.rdata) {
          resolve(response.rdata);
        } else {
          resolve(false);
        }
      });
  });
}
