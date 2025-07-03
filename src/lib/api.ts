import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ENDPOINTS } from './endpoints';
import { http } from './http';

// API Configuration
const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5678/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and token management
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('🌐 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }

    return response;
  },
  async (error) => {
    // Log error (in development)
    if (process.env.NODE_ENV === 'development') {
      const status = error?.response?.status;
      const url = error?.config?.url;
      const message = error?.response?.data?.message || error?.message || String(error);
      console.error('❌ API Error:', { status, url, message, raw: error });
    }

    // Handle 401 Unauthorized - clear tokens and redirect
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('userToken');
      localStorage.removeItem('adminData');
      localStorage.removeItem('userData');
      localStorage.removeItem('userRole');
      
      // Redirect to login (you can customize this)
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// Manager APIs
export const loginManager = (body: { email: string; password: string }) =>
  http(ENDPOINTS.manager.login, { method: "POST", body: JSON.stringify(body) });

// Admin APIs
export const loginAdmin = (body: { email: string; password: string }) =>
  http(ENDPOINTS.admin.login, { method: "POST", body: JSON.stringify(body) });

export const getManagers = () =>
  http(ENDPOINTS.manager.all);

export const addManager = (body: any) =>
  http(ENDPOINTS.manager.add, { method: "POST", body: JSON.stringify(body) });

export const updateManager = (id: string, body: any) =>
  http(ENDPOINTS.manager.single(id), { method: "PUT", body: JSON.stringify(body) });

export const deleteManager = (id: string, body: any) =>
  http(ENDPOINTS.manager.single(id), { method: "DELETE", body: JSON.stringify(body) });

// Employee APIs
export const getEmployees = () =>
  http(ENDPOINTS.employee.all);

export const addEmployee = (body: any) =>
  http(ENDPOINTS.employee.add, { method: "POST", body: JSON.stringify(body) });

export const updateEmployee = (id: string, body: any) =>
  http(ENDPOINTS.employee.single(id), { method: "PUT", body: JSON.stringify(body) });

export const deleteEmployee = (id: string, body: any) =>
  http(ENDPOINTS.employee.single(id), { method: "DELETE", body: JSON.stringify(body) });

// Attendance
export const clockInAttendance = (formData: FormData) =>
  http(ENDPOINTS.attendance.stepIn, { method: "POST", body: formData, isFormData: true });

export const clockOutAttendance = (formData: FormData) =>
  http('http://localhost:5678/api/attendence/step-out', { method: "POST", body: formData, isFormData: true });

// Dashboard
export const getDashboard = () =>
  http(ENDPOINTS.dashboard); 