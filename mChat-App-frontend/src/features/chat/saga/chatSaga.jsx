import { takeEvery, takeLatest, call, put, select } from "redux-saga/effects";
import socket from "../../../services/socket";
import {
  loadChatsRequest,
  loadChatsSuccess,
  loadChatsFailure,
  setActiveChat,
  loadMessagesRequest,
  loadMessagesSuccess,
  loadMessagesFailure,
  sendMessageRequest,
  sendMessageSuccess,
  sendMessageFailure,
} from "../slice/chatSlice";
import { myChatsAPI, listMessagesAPI, sendMessageAPI, markAsReadAPI } from "../api/chatAPI";

function* loadChatsWorker() {
  try {
    const res = yield call(myChatsAPI);
    yield put(loadChatsSuccess(res.data?.chats ?? []));
  } catch (err) {
    const message = err.response?.data?.error ?? err.message ?? "Failed to load chats";
    yield put(loadChatsFailure(typeof message === "string" ? message : "Failed to load chats"));
  }
}

function* activeChatChangedWorker(action) {
  const chatId = action.payload;
  if (!chatId) return;
  yield put(loadMessagesRequest());
  try {
    const res = yield call(listMessagesAPI, chatId, { limit: 50 });
    yield put(loadMessagesSuccess(res.data?.messages ?? []));
    // Mark as read
    yield call(markAsReadAPI, chatId);
    socket.emit("markAsRead", { chatId });
  } catch (err) {
    const message = err.response?.data?.error ?? err.message ?? "Failed to load messages";
    yield put(loadMessagesFailure(typeof message === "string" ? message : "Failed to load messages"));
  }
}

function* sendMessageWorker(action) {
  try {
    const chatId = yield select((s) => s.chat.activeChatId);
    if (!chatId) throw new Error("No active chat selected");
    const { text, clientTempId } = action.payload;
    if (socket.connected) {
      const response = yield call(
        (id, body, tempId) =>
          new Promise((resolve) => {
            const timeoutId = setTimeout(() => resolve({ error: "Message send timed out" }), 8000);
            socket.emit("sendMessage", { chatId: id, text: body, clientTempId: tempId }, (ack) => {
              clearTimeout(timeoutId);
              resolve(ack);
            });
          }),
        chatId,
        text,
        clientTempId,
      );

      if (response?.message) {
        yield put(sendMessageSuccess({
          message: response.message,
          chat: response.chat,
          clientTempId: response.clientTempId ?? clientTempId,
        }));
      } else if (response?.error) {
        throw new Error(response.error);
      } else {
        throw new Error("Failed to send message");
      }
      return;
    }

    const res = yield call(sendMessageAPI, chatId, { text });
    yield put(sendMessageSuccess({ message: res.data?.message, clientTempId }));
  } catch (err) {
    const message = err.response?.data?.error ?? err.message ?? "Failed to send message";
    yield put(sendMessageFailure({ message: typeof message === "string" ? message : "Failed to send message", clientTempId: action.payload?.clientTempId }));
  }
}

export default function* chatSaga() {
  yield takeLatest(loadChatsRequest.type, loadChatsWorker);
  yield takeLatest(setActiveChat.type, activeChatChangedWorker);
  yield takeEvery(sendMessageRequest.type, sendMessageWorker);
}
