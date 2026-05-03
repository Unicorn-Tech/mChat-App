require("dotenv").config();

const { createApp } = require("./src/app");
const { connectToDb } = require("./src/db/connect");
const { PORT, NODE_ENV, DB_URI } = require("./config/config");
const { verifyToken } = require("./src/utils/jwt");
const { JWT_SECRET } = require("./config/config");
const { Chat } = require("./src/models/Chat");
const { Message } = require("./src/models/Message");
const { User } = require("./src/models/User");
const { enrichChatForUser } = require("./src/controllers/chatController");

function isChatMember(chat, userId) {
  return chat?.members?.some((member) => {
    const memberId = member?._id ?? member;
    return memberId?.toString() === userId.toString();
  });
}

async function start() {
  await connectToDb(DB_URI);

  const app = createApp();
  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${PORT} (${NODE_ENV})`);
  });

  // Socket.io setup
  const io = require("socket.io")(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
      credentials: true,
    },
  });

  const onlineUsers = new Map(); // userId -> Set<socketId>
  app.set("io", io);
  app.set("onlineUsers", onlineUsers);

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    const emitOnlineUsers = () => {
      const onlineUserIds = Array.from(onlineUsers.keys()).map((id) => id.toString());
      io.emit("onlineUsers", onlineUserIds);
      return onlineUserIds;
    };

    socket.on("authenticate", async (data, callback) => {
      const { token } = data;
      if (!token) return;
      try {
        const decoded = verifyToken(token, JWT_SECRET);
        const userId = decoded.sub;
        socket.userId = userId;

        const currentSockets = onlineUsers.get(userId) ?? new Set();
        currentSockets.add(socket.id);
        onlineUsers.set(userId, currentSockets);

        await User.findByIdAndUpdate(userId, { status: "online" });

        // Join user to their chats
        const chats = await Chat.find({ members: userId });
        chats.forEach((chat) => socket.join(chat._id.toString()));

        const onlineUserIds = emitOnlineUsers();
        if (typeof callback === "function") callback({ ok: true, onlineUsers: onlineUserIds });

        console.log(`User ${userId} authenticated with socket ${socket.id}`);
      } catch (err) {
        console.error("Auth error:", err);
        if (typeof callback === "function") callback({ error: "Authentication failed" });
      }
    });

    socket.on("joinChat", async (data) => {
      if (!socket.userId) return;
      const { chatId } = data;
      if (!chatId) return;
      try {
        const chat = await Chat.findById(chatId);
        if (isChatMember(chat, socket.userId)) {
          socket.join(chatId.toString());
        }
      } catch (err) {
        console.error("Join chat error:", err);
      }
    });

    socket.on("sendMessage", async (data, callback) => {
      if (!socket.userId) {
        console.error("sendMessage: socket.userId not set");
        if (typeof callback === "function") callback({ error: "Not authenticated" });
        return;
      }
      const { chatId, text, clientTempId } = data || {};
      const messageText = (text ?? "").toString().trim();
      if (!chatId || !messageText) {
        if (typeof callback === "function") callback({ error: "chatId and text are required" });
        return;
      }

      try {
        const chat = await Chat.findById(chatId).populate("members", "name email avatarUrl status lastSeenAt");
        if (!isChatMember(chat, socket.userId)) {
          if (typeof callback === "function") callback({ error: "Chat not found or access denied" });
          return;
        }

        const msg = await Message.create({
          chat: chatId,
          sender: socket.userId,
          text: messageText,
          readBy: [socket.userId],
        });

        chat.lastMessage = msg._id;
        await chat.save();

        const populated = await Message.findById(msg._id).populate("sender", "name email avatarUrl");
        const socketChat = enrichChatForUser(chat, socket.userId);

        // Emit directly to every online member socket so newly-created chats update immediately.
        chat.members.forEach((memberId) => {
          const memberIdStr = (memberId._id ?? memberId).toString();
          const sockets = onlineUsers.get(memberIdStr);
          if (sockets) {
            sockets.forEach((memberSocketId) => {
              const memberSocket = io.sockets.sockets.get(memberSocketId);
              if (memberSocket) {
                memberSocket.emit("newMessage", {
                  chatId,
                  message: populated,
                  chat: enrichChatForUser(chat, memberIdStr),
                  clientTempId,
                });
                memberSocket.join(chatId.toString());
              }
            });
          }
        });

        if (typeof callback === "function") {
          callback({ success: true, chatId, message: populated, chat: socketChat, clientTempId });
        }
      } catch (err) {
        console.error("Send message error:", err);
        if (typeof callback === "function") callback({ error: "Failed to send message" });
      }
    });

    socket.on("markAsRead", async (data) => {
      if (!socket.userId) return;
      const { chatId } = data;
      try {
        const chat = await Chat.findById(chatId);
        if (!isChatMember(chat, socket.userId)) return;

        await Message.updateMany(
          { chat: chatId, readBy: { $ne: socket.userId } },
          { $addToSet: { readBy: socket.userId } }
        );

        io.to(chatId).emit("messagesRead", { chatId, userId: socket.userId });
      } catch (err) {
        console.error("Mark as read error:", err);
      }
    });

    socket.on("disconnect", async () => {
      if (socket.userId) {
        const sockets = onlineUsers.get(socket.userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            onlineUsers.delete(socket.userId);
            await User.findByIdAndUpdate(socket.userId, { status: "offline", lastSeenAt: new Date() });
          }
        }

        emitOnlineUsers();
      }
      console.log("User disconnected:", socket.id);
    });
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});
