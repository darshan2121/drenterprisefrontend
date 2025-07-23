// src/utils/auth.ts
import { jwtDecode } from 'jwt-decode';

export function getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminToken') || localStorage.getItem('userToken');
    }
    return null;
  }

export function decodeToken(token: string): any {
  try {
    return jwtDecode(token);
  } catch (e) {
    return null;
  }
}

function isAdminAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("adminToken");
}

function isManagerAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("managerToken");
}