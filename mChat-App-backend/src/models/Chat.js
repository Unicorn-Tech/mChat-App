const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String, trim: true, default: "" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true },
);

chatSchema.index({ members: 1, updatedAt: -1 });

const Chat = mongoose.model("Chat", chatSchema);
module.exports = { Chat };

