import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3001/api",
});

export const fetchLogs = async ({ queryKey }) => {
  const [_, { startDate, endDate }] = queryKey;
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const res = await api.get("/logs", { params });
  return res.data;
};

export const fetchSessions = async ({ queryKey }) => {
  const [_, { startDate, endDate }] = queryKey;
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const res = await api.get("/logs/sessions", { params });
  return res.data;
};
