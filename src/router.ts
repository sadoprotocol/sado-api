import express from "express";
import createError from "http-errors";

import { DEFAULT_NETWORK } from "./Libraries/Network";
import { sado } from "./Services/Sado";

export const router = express.Router();

router.post("/resolve", function (req, res, next) {
  if (req.body && req.body.address) {
    sado
      .resolve(req.body.address, req.body.network ?? DEFAULT_NETWORK)
      .then(() => {
        return res.json({
          success: true,
          message: "Orderbook of " + req.body.address,
        });
      })
      .catch(next);
  } else {
    next(createError(416, "Expecting address key value"));
  }
});

router.all("/get", function (req, res, next) {
  if (req.body && req.body.address) {
    sado
      .get(req.body.address, req.body.network ?? DEFAULT_NETWORK)
      .then((balance) => {
        res.json({
          success: true,
          message: "Orderbook of " + req.body.address,
          rdata: balance,
        });
      })
      .catch(next);
  } else {
    next(createError(416, "Expecting address key value"));
  }
});
