import axios from "axios";

const TOKEN_KEY = "mchat_token";

const apiClient = axios.create({
  // Backend defaults to PORT=3000 (see backend `.env.example`)
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { TOKEN_KEY };
export default apiClient;
