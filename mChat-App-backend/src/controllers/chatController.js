const createError = require("http-errors");
const mongoose = require("mongoose");
const { asyncHandler } = require("../utils/asyncHandler");
const { Chat } = require("../models/Chat");
const { User } = require("../models/User");

function ensureObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(400, "Invalid id");
  return new mongoose.Types.ObjectId(id);
}

async function resolveDirectChatUser(req) {
  const selectedEmail = req.body.email ? req.body.email.toString().trim().toLowerCase() : "";
  const selectedUserId = req.body.userId && mongoose.Types.ObjectId.isValid(req.body.userId)
    ? new mongoose.Types.ObjectId(req.body.userId)
    : null;

  if (selectedEmail) {
    const userByEmail = await User.findOne({ email: selectedEmail });
    if (userByEmail) return userByEmail;
  }

  if (selectedUserId) {
    return User.findById(selectedUserId);
  }

  throw createError(400, "Selected user is invalid");
}

function enrichChatForUser(chat, currentUserId) {
  const chatObject = typeof chat.toObject === "function" ? chat.toObject() : chat;
  if (chatObject.isGroup) return chatObject;

  const currentId = currentUserId.toString();
  const directPartner = (chatObject.members ?? []).find((member) => {
    const memberId = member?._id?.toString() ?? member?.toString();
    return memberId && memberId !== currentId;
  });

  return { ...chatObject, directPartner: directPartner ?? null };
}

const myChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ members: req.user._id })
    .sort({ updatedAt: -1 })
    .populate("members", "name email avatarUrl status lastSeenAt")
    .populate({
      path: "lastMessage",
      select: "text sender createdAt",
      populate: { path: "sender", select: "name email avatarUrl" },
    });

  const currentUserId = req.user._id.toString();
  const validChats = chats.filter((chat) => {
    if (chat.isGroup) return true;
    const memberIds = (chat.members ?? []).map((member) => member?._id?.toString() ?? member?.toString()).filter(Boolean);
    const uniqueMemberIds = new Set(memberIds);
    return uniqueMemberIds.size >= 2 && memberIds.some((memberId) => memberId !== currentUserId);
  });

  res.json({ chats: validChats.map((chat) => enrichChatForUser(chat, req.user._id)) });
});

const createDirectChat = asyncHandler(async (req, res) => {
  const otherUser = await resolveDirectChatUser(req);
  if (!otherUser) throw createError(404, "Selected user not found");
  const otherUserId = otherUser._id;
  if (otherUserId.equals(req.user._id)) throw createError(400, "Cannot chat with yourself");

  // Find existing direct chat with exactly these two users.
  const existing = await Chat.findOne({
    isGroup: false,
    members: { $all: [req.user._id, otherUserId] },
    $expr: { $eq: [{ $size: "$members" }, 2] },
  });
  if (existing) {
    const populatedExisting = await existing.populate("members", "name email avatarUrl status lastSeenAt");
    return res.status(200).json({ chat: enrichChatForUser(populatedExisting, req.user._id) });
  }

  const chat = await Chat.create({ isGroup: false, members: [req.user._id, otherUserId] });
  const populatedChat = await chat.populate("members", "name email avatarUrl status lastSeenAt");
  res.status(201).json({ chat: enrichChatForUser(populatedChat, req.user._id) });
});

const createGroupChat = asyncHandler(async (req, res) => {
  const name = (req.body.name ?? "").toString().trim();
  const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
  if (!name) throw createError(422, "Group name is required");

  const members = [...new Set([req.user._id.toString(), ...memberIds.map(String)])].map(ensureObjectId);
  if (members.length < 3) throw createError(422, "Group must have at least 3 members");

  const chat = await Chat.create({
    isGroup: true,
    name,
    members,
    admins: [req.user._id],
  });

  res.status(201).json({ chat });
});

module.exports = { myChats, createDirectChat, createGroupChat, enrichChatForUser };
