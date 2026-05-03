import { jwtDecode } from "jwt-decode";
import { takeLatest, call, put } from "redux-saga/effects";

import { TOKEN_KEY } from "../../../services/apiClient";
import {
  loginRequest,
  loginSuccess,
  loginFailure,
  registerRequest,
  registerSuccess,
  registerFailure,
} from "../slice/authSlice";
import { loginAPI, registerAPI } from "../api/authAPI";
import { clearChat } from "../../chat/slice/chatSlice";
import socket from "../../../services/socket";

function normalizeAuthPayload(data) {
  if (!data || typeof data !== "object") return { user: data };
  const token = data.token ?? data.accessToken ?? data.access_token;
  let user = data.user ?? data.profile ?? null;
  if (token && !user) {
    try {
      user = jwtDecode(token);
    } catch {
      user = { label: "Signed in" };
    }
  }
  return { user, token };
}

function* loginWorker(action) {
  try {
    socket.disconnect();
    localStorage.removeItem(TOKEN_KEY);
    yield put(clearChat());
    const res = yield call(loginAPI, action.payload);
    const payload = normalizeAuthPayload(res.data);
    if (payload.token) {
      localStorage.setItem(TOKEN_KEY, payload.token);
    }
    yield put(loginSuccess(payload));
  } catch (err) {
    const message =
      err.response?.data?.message ??
      err.response?.data?.error ??
      err.message ??
      "Login failed";
    yield put(loginFailure(typeof message === "string" ? message : "Login failed"));
  }
}

function* registerWorker(action) {
  try {
    socket.disconnect();
    localStorage.removeItem(TOKEN_KEY);
    yield put(clearChat());
    const res = yield call(registerAPI, action.payload);
    const payload = normalizeAuthPayload(res.data);
    if (payload.token) {
      localStorage.setItem(TOKEN_KEY, payload.token);
    }
    yield put(registerSuccess(payload));
  } catch (err) {
    const message =
      err.response?.data?.message ??
      err.response?.data?.error ??
      err.message ??
      "Registration failed";
    yield put(
      registerFailure(typeof message === "string" ? message : "Registration failed")
    );
  }
}

export default function* authSaga() {
  yield takeLatest(loginRequest.type, loginWorker);
  yield takeLatest(registerRequest.type, registerWorker);
}
