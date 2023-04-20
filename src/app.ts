import express, { ErrorRequestHandler } from "express";
import helmet from "helmet";
import createError from "http-errors";
import logger from "morgan";
import path from "path";

import { router } from "./router";

export const app = express();

/*
 |--------------------------------------------------------------------------------
 | Register Middleware
 |--------------------------------------------------------------------------------
 */

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use(logger("dev"));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Allow-Headers", "*");

  if ("OPTIONS" === req.method) {
    res.sendStatus(200);
  } else {
    next();
  }
});

/*
 |--------------------------------------------------------------------------------
 | Register Router
 |--------------------------------------------------------------------------------
 */

app.use("/", router);

/*
 |--------------------------------------------------------------------------------
 | Register Error Handler
 |--------------------------------------------------------------------------------
 */

// catch 404 and forward to error handler
app.use(function forwardError404(_req, _res, next) {
  next(createError(404));
});

// error handler
app.use(function errorHandler(err, _req, res, _next) {
  res.status(err.status || 500);
  res.json({
    success: false,
    message: err.message || err,
  });
} as ErrorRequestHandler);
