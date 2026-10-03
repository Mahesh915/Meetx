import { Server } from 'socket.io';

/**
 * In-memory room state.
 *
 * connections : { [roomPath]: Set<socketId> }
 * messages    : { [roomPath]: Array<{ sender, data, socketIdSender, time }> }
 * timeOnline  : { [socketId]: Date }
 *
 * NOTE: This is a single-process in-memory store.
 * For horizontal scaling (multiple Node processes / PM2 cluster) you would
 * need to replace these maps with a Redis adapter for Socket.IO.
 */
const connections = {};   // roomPath → Set of socketIds
const messages    = {};   // roomPath → message history
const timeOnline  = {};   // socketId → Date joined

export const connectToSocket = (server) => {
    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

    const io = new Server(server, {
        cors: {
            origin: corsOrigin,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        // ── join-call ──────────────────────────────────────────────────────
        socket.on('join-call', (path) => {
            // Validate payload
            if (typeof path !== 'string' || !path.trim()) {
                console.warn(`[Socket] join-call from ${socket.id}: invalid path`);
                return;
            }

            const roomPath = path.trim();

            // Prevent duplicate membership (socket already in this room)
            if (connections[roomPath]?.has(socket.id)) {
                console.warn(`[Socket] ${socket.id} already in room ${roomPath}`);
                return;
            }

            // Initialise room structures
            if (!connections[roomPath]) {
                connections[roomPath] = new Set();
            }
            if (!messages[roomPath]) {
                messages[roomPath] = [];
            }

            connections[roomPath].add(socket.id);
            timeOnline[socket.id] = new Date();

            const clientList = Array.from(connections[roomPath]);

            // Notify all members (including the new joiner) of the new participant list
            for (const memberId of clientList) {
                io.to(memberId).emit('user-joined', socket.id, clientList);
            }

            // Replay chat history to the new joiner only
            if (messages[roomPath].length > 0) {
                io.to(socket.id).emit(
                    'chat-history',
                    messages[roomPath].map(m => ({
                        sender: m.sender,
                        data:   m.data,
                        time:   m.time,
                    }))
                );
            }
        });

        // ── signal (WebRTC signalling relay) ──────────────────────────────
        socket.on('signal', (toId, message) => {
            // Validate: toId must be a non-empty string, message must be a string
            if (typeof toId !== 'string' || !toId || typeof message !== 'string') {
                console.warn(`[Socket] signal from ${socket.id}: invalid payload`);
                return;
            }
            io.to(toId).emit('signal', socket.id, message);
        });

        // ── chat-message ──────────────────────────────────────────────────
        socket.on('chat-message', (data, sender) => {
            // Validate
            if (typeof data !== 'string' || !data.trim()) return;
            if (typeof sender !== 'string' || !sender.trim()) return;

            // Find the room this socket belongs to
            let matchingRoom = null;
            for (const [roomPath, memberSet] of Object.entries(connections)) {
                if (memberSet.has(socket.id)) {
                    matchingRoom = roomPath;
                    break;
                }
            }

            if (!matchingRoom) {
                console.warn(`[Socket] chat-message from ${socket.id}: not in any room`);
                return;
            }

            const timestamp = new Date().toISOString();
            const entry = {
                sender,
                data:           data.trim(),
                socketIdSender: socket.id,
                time:           timestamp,
            };

            messages[matchingRoom].push(entry);

            // Broadcast to all members of the room (including sender for confirmation)
            for (const memberId of connections[matchingRoom]) {
                io.to(memberId).emit(
                    'chat-message',
                    entry.data,
                    entry.sender,
                    entry.socketIdSender,
                    entry.time
                );
            }
        });

        // ── disconnect ────────────────────────────────────────────────────
        socket.on('disconnect', () => {
            const joined = timeOnline[socket.id];
            const durationMs = joined ? Date.now() - joined.getTime() : 0;
            console.log(
                `[Socket] Disconnected: ${socket.id} ` +
                `(online ${Math.round(durationMs / 1000)}s)`
            );

            delete timeOnline[socket.id];

            // Find and remove from room
            for (const [roomPath, memberSet] of Object.entries(connections)) {
                if (!memberSet.has(socket.id)) continue;

                memberSet.delete(socket.id);

                // Notify remaining members AFTER removal so they don't
                // try to create a peer connection to a socket that has left.
                for (const remainingId of memberSet) {
                    io.to(remainingId).emit('user-left', socket.id);
                }

                // Clean up empty rooms to prevent memory leaks
                if (memberSet.size === 0) {
                    delete connections[roomPath];
                    delete messages[roomPath];
                    console.log(`[Socket] Room ${roomPath} is now empty, cleaned up`);
                }

                // A socket can only be in one room, stop searching
                break;
            }
        });
    });

    return io;
};
