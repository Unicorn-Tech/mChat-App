import { createSlice } from "@reduxjs/toolkit";

import { TOKEN_KEY } from "../../../services/apiClient";

const storedToken = localStorage.getItem(TOKEN_KEY);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: storedToken,
    loading: false,
    error: null,
  },
  reducers: {
    hydrateAuth: (state, action) => {
      if (action.payload?.user !== undefined) {
        state.user = action.payload.user;
      }
      if (action.payload?.token) {
        state.token = action.payload.token;
      } else if (action.payload?.token === null) {
        state.token = null;
      }
    },
    loginRequest: (state) => {
      state.loading = true;
      state.error = null;
      state.user = null;
      state.token = null;
      localStorage.removeItem(TOKEN_KEY);
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload.user ?? action.payload;
      state.token = action.payload.token ?? state.token;
      state.error = null;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    registerRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    registerSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload.user ?? action.payload;
      state.token = action.payload.token ?? state.token;
      state.error = null;
    },
    registerFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem(TOKEN_KEY);
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
});

export const {
  hydrateAuth,
  loginRequest,
  loginSuccess,
  loginFailure,
  registerRequest,
  registerSuccess,
  registerFailure,
  logout,
  clearAuthError,
} = authSlice.actions;

export default authSlice.reducer;
