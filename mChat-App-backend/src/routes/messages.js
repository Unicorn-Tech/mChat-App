const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { listMessages, sendMessage, markAsRead } = require("../controllers/messageController");

const router = express.Router({ mergeParams: true });

router.get("/:chatId", requireAuth, listMessages);
router.post("/:chatId", requireAuth, sendMessage);
router.put("/:chatId/read", requireAuth, markAsRead);

module.exports = { messagesRouter: router };

