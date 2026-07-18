import { Server } from "socket.io";

let io: Server;

export const initializeSocket = (
  server: any
) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  console.log("✅ Socket.IO Ready");
};

export const getIO = () => io;