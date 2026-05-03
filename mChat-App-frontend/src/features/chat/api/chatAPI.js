import apiClient from "../../../services/apiClient";

export const listUsersAPI = (params) => apiClient.get("/users", { params });

export const myChatsAPI = () => apiClient.get("/chats");
export const createDirectChatAPI = (data) => apiClient.post("/chats/direct", data); // { userId }
export const createGroupChatAPI = (data) => apiClient.post("/chats/group", data); // { name, memberIds }

export const listMessagesAPI = (chatId, params) => apiClient.get(`/messages/${chatId}`, { params });
export const sendMessageAPI = (chatId, data) => apiClient.post(`/messages/${chatId}`, data); // { text, attachments? }
export const markAsReadAPI = (chatId) => apiClient.put(`/messages/${chatId}/read`);

