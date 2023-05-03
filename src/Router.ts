import express from "express";
import createError from "http-errors";

import { Order } from "./Entities/Order";
import { DEFAULT_NETWORK, Network, VALID_NETWORK } from "./Libraries/Network";
import { sado } from "./Services/Sado";

export const router = express.Router();

/*
 |--------------------------------------------------------------------------------
 | Orderbook
 |--------------------------------------------------------------------------------
 */

router.post("/orderbooks/:address", async function (req, res) {
  const network = getNetwork(req.query.network);
  await sado.resolve(req.params.address, network);
  return res.json({
    success: true,
    message: `Orderbook of ${req.params.address} resolved on ${network}`,
  });
});

router.get("/orderbooks/:address", async function (req, res) {
  const network = getNetwork(req.query.network);
  return res.json({
    success: true,
    message: `Orderbook of ${req.params.address} fetched on ${network}`,
    rdata: await sado.fetch(req.params.address, network),
  });
});

router.delete("/orderbooks/:address", async function (req, res) {
  const network = getNetwork(req.query.network);
  await sado.delete(req.params.address, network);
  return res.json({
    success: true,
    message: `Orderbook of ${req.params.address} deleted on ${network}`,
  });
});

// [TODO] Deprecate this endpoint in favor of more granular endpoints
router.all("/get", async function (req, res, next) {
  if (req.body && req.body.address) {
    return res.json({
      success: true,
      message: `Orderbook of ${req.body.address}`,
      rdata: await sado.fetch(req.body.address, req.body.network ?? DEFAULT_NETWORK),
    });
  } else {
    next(createError(416, "Expecting address key value"));
  }
});

/*
 |--------------------------------------------------------------------------------
 | Orders
 |--------------------------------------------------------------------------------
 */

router.get("/orders", async function (_, res) {
  return res.json({
    success: true,
    data: await Order.find(),
  });
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function getNetwork(value: any): Network {
  if (VALID_NETWORK.includes(value) === true) {
    return value as Network;
  }
  return DEFAULT_NETWORK;
}
