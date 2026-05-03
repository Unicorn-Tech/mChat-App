import apiClient from "../../../services/apiClient";

export const loginAPI = (data) => {
  return apiClient.post("/auth/login", data);
};

export const registerAPI = (data) => {
  return apiClient.post("/auth/register", data);
};

export const meAPI = () => {
  return apiClient.get("/auth/me");
};
