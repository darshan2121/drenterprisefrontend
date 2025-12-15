// api/api.ts
import axios from 'axios';
import { getToken } from '../utils/auth';

const instance = axios.create({
  // Point frontend API requests to the local backend; adjust if deploying.
  baseURL: 'https://api.drenterprise.it/api',
  headers: { 'Content-Type': 'application/json' },
});

// Inject Bearer token
instance.interceptors.request.use(async (config) => {
  const token = await getToken(); // fetch from storage
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const api = {
  fetchEmployees: () => instance.get('/employees'),
  createEmployee: (payload) => instance.post('/employees', payload),
  updateEmployee: (id, payload) => instance.put(`/employees/${id}`, payload),
  deleteEmployee: (id) => instance.delete(`/employees/${id}`),
};
