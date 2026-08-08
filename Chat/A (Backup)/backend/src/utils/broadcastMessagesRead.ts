import { getIO } from "../config/io.js";

export type MessagesReadPayload = {
    chat_id: number;
    reader_id: number;
    last_read_message_id: number;
    chat_type?: string;
};

/** Notify chat room that a member advanced their read cursor (seen receipts). */
export function broadcastMessagesRead(
    tenantId: number,
    payload: MessagesReadPayload,
    exceptSocketId?: string,
) {
    const io = getIO();
    if (!io || !payload?.last_read_message_id) return;

    const room = `tenant:${tenantId},chat_id:${payload.chat_id}.messages`;
    const packet = {
        chat_id: payload.chat_id,
        reader_id: payload.reader_id,
        last_read_message_id: payload.last_read_message_id,
        chat_type: payload.chat_type,
    };

    if (exceptSocketId) {
        io.to(room).except(exceptSocketId).emit("messages_read", packet);
    } else {
        io.to(room).emit("messages_read", packet);
    }
}
