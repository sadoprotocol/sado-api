import http from "node:http";

import { app } from "./app";
import { config } from "./config";

const { port } = config;

/*
 |--------------------------------------------------------------------------------
 | Set Port
 |--------------------------------------------------------------------------------
 |
 | Get port from config and store in Express.
 |
 */

app.set("port", port);

/*
 |--------------------------------------------------------------------------------
 | Create Server
 |--------------------------------------------------------------------------------
 */

const server = http.createServer(app);

/*
 |--------------------------------------------------------------------------------
 | Start Server
 |--------------------------------------------------------------------------------
 |
 | Listen on provided port, on all network interfaces.
 |
 */

server.listen(port);

/*
 |--------------------------------------------------------------------------------
 | Event Listeners
 |--------------------------------------------------------------------------------
 |
 | onError:     Event listener for HTTP server "error" event.
 | onListening: Event listener for HTTP server "listening" event.
 |
 */

server.on("error", onError);
server.on("listening", onListening);

function onError(error: NodeJS.ErrnoException) {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
    default:
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr?.port ?? -1;
  console.log("Listening on " + bind);
}
