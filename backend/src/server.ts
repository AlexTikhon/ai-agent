import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { wsGateway } from "./ws/gateway";

const server = http.createServer(app);
wsGateway.init(server);

server.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT}/api`);
  console.log(`WS running on ws://localhost:${env.PORT}/ws`);
});
