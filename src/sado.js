"use strict";

const bitcoinjs = require('bitcoinjs-lib');
const moment = require('moment');
const infura = require('../src/infura');
const redis = require('../src/redis');
const lookup = require('../src/lookup');

const network = process.env.NETWORK;

exports.get = get;

async function getOwner(outpoint) {
  if (outpoint && outpoint.indexOf(':') > 0) {
    let locs = outpoint.split(':');
    let txid = locs[0];
    let vout = locs[1];

    let res = await lookup.transaction(txid);

    if (
      typeof res === 'object' 
      && typeof res.vout === 'object'
      && typeof res.vout[vout] === 'object'
      && typeof res.vout[vout].scriptPubKey === 'object'
      && typeof res.vout[vout].scriptPubKey.address !== 'undefined'
    ) {
      return res.vout[vout].scriptPubKey.address;
    }
  }

  return false;
}

async function get(address) {
  const orderbook = {
    cids: {
      orders: [],
      offers: []
    },
    orders: [],
    offers: []
  };

  const filtered_orderbook = {
    orders: [],
    offers: []
  };

  let order_count = 0;
  let offer_count = 0;

  async function filter(o, r, t) {
    if (typeof r === 'object') {
      if (r.type === 'buy') {
        r.buy = true;
        r.sell = false;
      } else {
        r.buy = false;
        r.sell = true;
      }

      r.ago = moment(r.ts).fromNow();

      if (t === 'order') {
        r.cid = orderbook.cids.orders[o];
        orderbook.orders.push(r);
        order_count++;

        if (
          offer_count === orderbook.cids.offers.length
          && order_count === orderbook.cids.orders.length
        ) {
          await finalFilter(orderbook);
        }
      } else if (t === 'offer') {
        r.cid = orderbook.cids.offers[o];
        orderbook.offers.push(r);
        offer_count++;

        if (
          offer_count === orderbook.cids.offers.length
          && order_count === orderbook.cids.orders.length
        ) {
          await finalFilter(orderbook);
        }
      } else {
        if (t === 'order') {
          order_count++;
        } else if (t === 'offer') {
          offer_count++;
        } if (
          offer_count === orderbook.cids.offers.length
          && order_count === orderbook.cids.orders.length
        ) {
          await finalFilter(orderbook);
        }
      }
    } else {
      if (t === 'order') {
        order_count++;
      } else if (t === 'offer') {
        offer_count++;
      }

      if (
        offer_count === orderbook.cids.offers.length
        && order_count === orderbook.cids.orders.length
      ) {
        await finalFilter(orderbook);
      }
    }
  }

  async function finalFilter(order_book) {
    for (var i = 0; i < order_book.orders.length; i++) {
      let vArg = order_book.orders[i].location.split(':');
      let txid = vArg[0];
      let vout_n = parseInt(vArg[1]);

      let tx = await lookup.transaction(txid);

      let voutIndex = tx.vout.findIndex(item => {
        return item.n === vout_n;
      });

      if (tx.vout[voutIndex].ordinals.length > 0 && tx.vout[voutIndex].inscriptions.length > 0) {
        order_book.orders[i].ordinals = tx.vout[voutIndex].ordinals;
        order_book.orders[i].inscriptions = tx.vout[voutIndex].inscriptions;
        filtered_orderbook.orders.push(order_book.orders[i]);
      }
    }

    for (var i = 0; i < order_book.offers.length; i++) {
      let vArg = order_book.offers[i].order.location.split(':');
      let txid = vArg[0];
      let vout_n = parseInt(vArg[1]);

      let tx = await lookup.transaction(txid);

      let voutIndex = tx.vout.findIndex(item => {
        return item.n === vout_n;
      });

      if (tx.vout[voutIndex].ordinals.length > 0 && tx.vout[voutIndex].inscriptions.length > 0) {
        order_book.offers[i].ordinals = tx.vout[voutIndex].ordinals;
        order_book.offers[i].inscriptions = tx.vout[voutIndex].inscriptions;
        filtered_orderbook.offers.push(order_book.offers[i]);
      }
    }
  }

  // ===

  let txs = await lookup.transactions(address);

  if (typeof txs === 'object' && txs.length > 0) {
    for (let i = 0; i < txs.length; i++) {
      for (let t = 0; t < txs[i].vout.length; t++) {
        if (
          typeof txs[i].vout[t].scriptPubKey === 'object'
          && typeof txs[i].vout[t].scriptPubKey.utf8 !== 'undefined'
          && txs[i].vout[t].scriptPubKey.utf8.includes("sado=")
        ) {
          let vs = txs[i].vout[t].scriptPubKey.utf8.split('=');
          let ids = vs[1].split(':');
          let type = ids[0];
          let cid = ids[1];

          if(type === 'order') {
            orderbook.cids.orders.push(cid);
          } else if(type === 'offer') {
            orderbook.cids.offers.push(cid);
          }
        }
      }
    }

    let order_cids = orderbook.cids.orders;
    let offer_cids = orderbook.cids.offers;

    let redisKey = `/${network}/sado/get/${address}/orders-offers/${order_cids.length}-${offer_cids.length}`;

    let gotCache = await redis.get({ key: redisKey });

    if (gotCache) {
      return gotCache;
    }

    if (order_cids.length > 0) {   
      for (let od = 0; od < order_cids.length; od++) {
        let response = await infura.get(order_cids[od]);

        if (
          typeof response === 'object'
          && typeof response.ts !== 'undefined'
          && typeof response.type !== 'undefined'
          && typeof response.maker !== 'undefined'
          && typeof response.location !== 'undefined'
          && typeof response.signature !== 'undefined'
        ) {
          let owner = await getOwner(response.location);

          if (response.type === 'sell' && owner === response.maker) {
            await filter(od, response, 'order');
          } else {
            await filter(od, false, 'order');
          }
        } else {   
          await filter(od, false, 'order');
        }
      }
    }

    if (offer_cids.length > 0) {
      for (let off = 0; off < offer_cids.length; off++) {
        let response = await infura.get(offer_cids[off]);

        if (
          typeof response === 'object'
          && typeof response.ts !== 'undefined'
          && typeof response.origin !== 'undefined'
          && typeof response.taker !== 'undefined'
          && typeof response.offer !== 'undefined'
          && typeof response.signature !== 'undefined'
        ) {
          let any_signatures = false;
          let temp_tx = bitcoinjs.Transaction.fromHex(response.offer);

          for (let v = 0; v < temp_tx.ins.length; v++) {
            if (temp_tx.ins[v].script.toString()) {
              any_signatures = true;
            }
          }

          if (any_signatures) {
            let origin = await infura.get(response.origin);

            if (
              typeof origin === 'object'
              && typeof origin.ts !== 'undefined'
              && typeof origin.type !== 'undefined'
              && typeof origin.maker !== 'undefined'
              && typeof origin.location !== 'undefined'
              && typeof origin.signature !== 'undefined'
            ) {
              response.order = origin;

              let owner = await getOwner(origin.location);

              if (owner === origin.maker || owner === response.taker) {
                await filter(off, response, 'offer');
              } else {
                await filter(off, false, 'offer');
              }
            }
          } else {
            await filter(off, false, 'offer');
          }
        } else {
          await filter(off, false, 'offer');
        }
      }
    }

    redis.set({
      key: redisKey,
      data: filtered_orderbook
    });
  }

  return filtered_orderbook;
}

