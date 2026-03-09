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
