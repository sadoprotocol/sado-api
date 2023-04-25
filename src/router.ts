import express from "express";
import createError from "http-errors";

import { sado } from "./services/sado";

export const router = express.Router();

// address base ==

router.all("/get", function (req, res, next) {
  if (req.body && req.body.address) {
    sado
      .get(req.body.address, req.body.network ?? "regtest")
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
