const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { myChats, createDirectChat, createGroupChat } = require("../controllers/chatController");

const router = express.Router();

router.get("/", requireAuth, myChats);
router.post("/direct", requireAuth, createDirectChat);
router.post("/group", requireAuth, createGroupChat);

module.exports = { chatsRouter: router };

