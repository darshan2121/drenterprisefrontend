import { getApiUrl } from './config';

export const BASE_URL = getApiUrl();
export const ENDPOINTS = {
  manager: {
    login: `${BASE_URL}/manager/login`,
    all: `${BASE_URL}/manager/all`,
    single: (id: string) => `${BASE_URL}/manager/${id}`,
    add: `${BASE_URL}/manager`,
  },
  admin: {
    login: `${BASE_URL}/admin/login`,
  },
  employee: {
    all: `${BASE_URL}/employee/all`,
    single: (id: string) => `${BASE_URL}/employee/${id}`,
    add: `${BASE_URL}/employee`,
    addByManager: `${BASE_URL}/employee/manager`,
  },
  attendance: {
    stepIn: `${BASE_URL}/attendence/step-in`,
    stepOut: `${BASE_URL}/attendence/step-out`,
    byEmployee: (id: string) => `${BASE_URL}/attendence/${id}`,
    single: (id: string) => `${BASE_URL}/attendence/${id}`,
    all: `${BASE_URL}/attendence`,
    bulkUpdate: `${BASE_URL}/attendence/bulk-update`,
    summary: `${BASE_URL}/attendence/summary`,
  },
  dashboard: `${BASE_URL}/dashboard`,
  auth: {
    forgotPassword: `${BASE_URL}/auth/forgot-password`,
    verifyOtp: `${BASE_URL}/auth/verify-otp`,
  },
}; 
 