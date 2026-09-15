import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail || error.message || "Something went wrong.";
    return Promise.reject(new Error(message));
  }
);

export const askQuestion = async (sessionId, question) => {
  const { data } = await api.post("/ask", { session_id: sessionId, question });
  return data;
};

export const listLectures = async (limit = 50) => {
  const { data } = await api.get(`/lectures?limit=${limit}`);
  return data;
};

export const getLecture = async (id) => {
  const { data } = await api.get(`/lectures/${id}`);
  return data;
};

export const deleteLecture = async (id) => {
  const { data } = await api.delete(`/lectures/${id}`);
  return data;
};

export default api;
