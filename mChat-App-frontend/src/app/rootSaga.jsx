import { all } from "redux-saga/effects";
import { authSaga } from "../features/auth";
import { chatSaga } from "../features/chat";
import { userSaga } from "../features/user";

export default function* rootSaga() {
  yield all([
    authSaga(),
    chatSaga(),
    userSaga()
  ]);
}
