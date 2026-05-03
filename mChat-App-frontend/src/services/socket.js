import { io } from "socket.io-client";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
const url = import.meta.env.VITE_SOCKET_URL ?? apiUrl.replace(/\/api\/?$/, "");

const socket = io(url, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  timeout: 10000,
});

export default socket;
