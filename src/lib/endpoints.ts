export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5678/api";

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
  },
  attendance: {
    stepIn: `${BASE_URL}/attendence/step-in`,
    byEmployee: (id: string) => `${BASE_URL}/attendence/${id}`,
    all: `${BASE_URL}/attendence`,
  },
  dashboard: `${BASE_URL}/dashboard`,
  auth: {
    forgotPassword: `${BASE_URL}/auth/forgot-password`,
    verifyOtp: `${BASE_URL}/auth/verify-otp`,
  },
}; 
 