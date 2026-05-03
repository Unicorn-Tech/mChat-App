const createError = require("http-errors");
const mongoose = require("mongoose");
const { asyncHandler } = require("../utils/asyncHandler");
const { Chat } = require("../models/Chat");
const { Message } = require("../models/Message");

function ensureObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(400, "Invalid id");
  return new mongoose.Types.ObjectId(id);
}

async function ensureMember(chatId, userId) {
  const chat = await Chat.findById(chatId);
  if (!chat) throw createError(404, "Chat not found");
  const isMember = chat.members.some((m) => m.toString() === userId.toString());
  if (!isMember) throw createError(403, "Forbidden");
  return chat;
}

function parseLimit(value, fallback = 30, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

const listMessages = asyncHandler(async (req, res) => {
  const chatId = ensureObjectId(req.params.chatId);
  await ensureMember(chatId, req.user._id);

  const limit = parseLimit(req.query.limit);
  const before = req.query.before ? new Date(req.query.before) : null;

  const filter = { chat: chatId };
  if (before && !Number.isNaN(before.getTime())) filter.createdAt = { $lt: before };

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("sender", "name email avatarUrl");

  res.json({ messages: messages.reverse() });
});

const sendMessage = asyncHandler(async (req, res) => {
  const chatId = ensureObjectId(req.params.chatId);
  const chat = await ensureMember(chatId, req.user._id);

  const text = (req.body.text ?? "").toString().trim();
  const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];

  if (!text.trim() && attachments.length === 0) throw createError(422, "Message is empty");

  const msg = await Message.create({
    chat: chatId,
    sender: req.user._id,
    text,
    attachments,
    readBy: [req.user._id],
  });

  chat.lastMessage = msg._id;
  await chat.save();

  const populated = await Message.findById(msg._id).populate("sender", "name email avatarUrl");
  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers");

  if (io && onlineUsers) {
    chat.members.forEach((memberId) => {
      const sockets = onlineUsers.get(memberId.toString());
      if (!sockets) return;
      sockets.forEach((socketId) => {
        const memberSocket = io.sockets.sockets.get(socketId);
        if (memberSocket) {
          memberSocket.emit("newMessage", { chatId: chatId.toString(), message: populated });
          memberSocket.join(chatId.toString());
        }
      });
    });
  }

  res.status(201).json({ message: populated });
});

const markAsRead = asyncHandler(async (req, res) => {
  const chatId = ensureObjectId(req.params.chatId);
  await ensureMember(chatId, req.user._id);

  await Message.updateMany(
    { chat: chatId, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  res.status(204).send();
});

module.exports = { listMessages, sendMessage, markAsRead };
