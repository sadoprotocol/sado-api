"use strict";

const fetch = require("node-fetch"); // Remove if you are using Node 18 above.
const gateway = process.env.INFURA_GATEWAY;


exports.get = get;


function get(cid) {
  return new Promise(resolve => {
    fetch (gateway + '/ipfs/' + cid, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(response => resolve(response));
  });
}
