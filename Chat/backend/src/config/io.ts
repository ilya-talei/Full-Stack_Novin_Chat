import type { Server } from "socket.io";

let ioRef: Server | null = null;

export function setIO(io: Server) {
    ioRef = io;
}

export function getIO(): Server | null {
    return ioRef;
}
