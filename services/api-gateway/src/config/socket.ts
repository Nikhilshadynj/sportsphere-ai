import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io: Server;

export const initializeSocket = (server: any) => {
	io = new Server(server, {
		cors: {
			origin: "http://localhost:3000",
		},
	});

	io.on("connection", (socket) => {
		console.log("✅ Client Connected", socket.id);

		const token = socket.handshake.auth.token;
		const decoded = jwt.verify(
			token,
			process.env.JWT_SECRET!
		) as any;

		console.log(
			`${decoded.id} joined room`
		);

		socket.join(decoded.id);

		socket.on("disconnect", () => {
			console.log("❌ Client Disconnected", socket.id);
		});
	});
};

export const getIO = () => io;