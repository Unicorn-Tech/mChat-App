import { createSlice } from "@reduxjs/toolkit";

const getEntityId = (entity) => {
  if (typeof entity === "string" || typeof entity === "number") return entity;
  return entity?._id ?? entity?.id ?? entity?.sub ?? (
    entity?.toString && entity.toString !== Object.prototype.toString ? entity.toString() : undefined
  );
};
const toIdString = (entity) => getEntityId(entity)?.toString();

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    chats: [],
    activeChatId: null,
    messages: [],
    onlineUsers: [],
    loading: false,
    error: null,
  },
  reducers: {
    loadChatsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    loadChatsSuccess: (state, action) => {
      state.loading = false;
      state.chats = action.payload ?? [];
    },
    loadChatsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    upsertChat: (state, action) => {
      const chat = action.payload;
      const chatId = toIdString(chat?._id ?? chat?.id);
      if (!chat || !chatId) return;
      const existingIndex = state.chats.findIndex((c) => toIdString(c?._id ?? c?.id) === chatId);
      if (existingIndex >= 0) {
        state.chats[existingIndex] = {
          ...chat,
          directPartner: chat.directPartner ?? state.chats[existingIndex].directPartner,
        };
        const [updated] = state.chats.splice(existingIndex, 1);
        state.chats.unshift(updated);
      } else {
        state.chats.unshift(chat);
      }
    },
    setActiveChat: (state, action) => {
      state.activeChatId = action.payload ?? null;
      state.messages = [];
      state.error = null;
    },
    loadMessagesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    loadMessagesSuccess: (state, action) => {
      state.loading = false;
      state.messages = action.payload ?? [];
    },
    loadMessagesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    sendMessageRequest: (state, action) => {
      state.error = null;
      const { text, clientTempId, sender } = action.payload ?? {};
      if (!state.activeChatId || !text || !clientTempId) return;
      if (state.messages.some((m) => m._id === clientTempId)) return;
      state.messages.push({
        _id: clientTempId,
        chat: state.activeChatId,
        sender,
        text,
        readBy: [sender?._id ?? sender?.id].filter(Boolean),
        createdAt: new Date().toISOString(),
        pending: true,
      });
    },
    sendMessageSuccess: (state, action) => {
      const msg = action.payload?.message ?? action.payload;
      const clientTempId = action.payload?.clientTempId;
      if (!msg) return;
      const tempIndex = clientTempId ? state.messages.findIndex((m) => m._id === clientTempId) : -1;
      if (tempIndex >= 0) {
        state.messages[tempIndex] = msg;
      } else if (!state.messages.some((m) => m._id === msg._id)) {
        state.messages.push(msg);
      }

      const chat = action.payload?.chat;
      const chatId = toIdString(chat?._id ?? chat?.id ?? msg.chat);
      if (!chatId) return;
      const chatIndex = state.chats.findIndex((c) => toIdString(c?._id ?? c?.id) === chatId);
      if (chatIndex >= 0) {
        state.chats[chatIndex] = {
          ...state.chats[chatIndex],
          ...chat,
          lastMessage: msg,
          directPartner: chat?.directPartner ?? state.chats[chatIndex].directPartner,
        };
        const [updated] = state.chats.splice(chatIndex, 1);
        state.chats.unshift(updated);
      } else if (chat) {
        state.chats.unshift({ ...chat, lastMessage: msg });
      }
    },
    sendMessageFailure: (state, action) => {
      state.error = action.payload?.message ?? action.payload;
      const clientTempId = action.payload?.clientTempId;
      if (clientTempId) {
        state.messages = state.messages.filter((m) => m._id !== clientTempId);
      }
    },
    newMessage: (state, action) => {
      const { message, clientTempId, chat } = action.payload;
      const chatId = action.payload.chatId ?? message?.chat;
      if (!chatId || !message?._id) return;
      const chatIdString = chatId.toString();
      if (chatIdString === state.activeChatId?.toString()) {
        const tempIndex = clientTempId ? state.messages.findIndex((m) => m._id === clientTempId) : -1;
        if (tempIndex >= 0) {
          state.messages[tempIndex] = message;
        } else if (!state.messages.some((m) => m._id === message._id)) {
          state.messages.push(message);
        }
      }
      const chatIndex = state.chats.findIndex((c) => c._id?.toString() === chatIdString);
      if (chatIndex >= 0) {
        state.chats[chatIndex] = {
          ...state.chats[chatIndex],
          ...chat,
          lastMessage: message,
          directPartner: chat?.directPartner ?? state.chats[chatIndex].directPartner,
        };
        const [updated] = state.chats.splice(chatIndex, 1);
        state.chats.unshift(updated);
      } else if (chat) {
        state.chats.unshift({ ...chat, lastMessage: message });
      }
    },
    messagesRead: (state, action) => {
      const { chatId, userId } = action.payload;
      if (toIdString(chatId) !== toIdString(state.activeChatId)) return;
      state.messages = state.messages.map((message) => {
        if (!(message.readBy ?? []).some((r) => toIdString(r) === toIdString(userId))) {
          return { ...message, readBy: [...(message.readBy ?? []), userId] };
        }
        return message;
      });
    },
    setOnlineUsers: (state, action) => {
      const onlineIds = new Set((action.payload ?? []).map(toIdString).filter(Boolean));
      state.onlineUsers = Array.from(onlineIds);
      state.chats.forEach((chat) => {
        (chat.members ?? []).forEach((member) => {
          const memberId = toIdString(member);
          if (!memberId) return;
          member.status = onlineIds.has(memberId) ? "online" : "offline";
        });
      });
    },
    clearChat: (state) => {
      state.chats = [];
      state.activeChatId = null;
      state.messages = [];
      state.onlineUsers = [];
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  loadChatsRequest,
  loadChatsSuccess,
  loadChatsFailure,
  upsertChat,
  setActiveChat,
  loadMessagesRequest,
  loadMessagesSuccess,
  loadMessagesFailure,
  sendMessageRequest,
  sendMessageSuccess,
  sendMessageFailure,
  newMessage,
  messagesRead,
  setOnlineUsers,
  clearChat,
} = chatSlice.actions;
export default chatSlice.reducer;
