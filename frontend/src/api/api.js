import axios from "axios";

const getBaseURL = () => {
  // In packaged Electron apps, the protocol is 'file:'
  // We must use absolute URLs because relative paths don't work with file://
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return "http://127.0.0.1:3001/api";
  }
  // In development (Web or Electron), use relative path which is handled by Vite proxy
  return "/api";
};

export const api = axios.create({
  baseURL: getBaseURL(),
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
export const deleteLog = async ({ id, machine, cycle_start_time }) => {
  const res = await api.delete(`/logs/${id}`, {
    params: { machine, cycle_start_time }
  });
  return res.data;
};

export const updateLog = async ({ id, machine, cycle_start_time, ...data }) => {
  const res = await api.put(`/logs/${id}`, {
    machine,
    cycle_start_time,
    ...data
  });
  return res.data;
};

export const fetchMachines = async () => {
  const res = await api.get("/metadata/machines");
  return res.data;
};

export const fetchActiveSessions = async () => {
  const res = await api.get("/logs/sessions/active");
  return res.data;
};

export const forceLogout = async (sessionId) => {
  const res = await api.post(`/logs/sessions/${sessionId}/logout`);
  return res.data;
};
