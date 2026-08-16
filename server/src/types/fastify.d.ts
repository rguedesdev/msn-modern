import type { Server as SocketIOServer } from "socket.io";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: import("fastify").preHandlerHookHandler;
    io: SocketIOServer;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

export {};
