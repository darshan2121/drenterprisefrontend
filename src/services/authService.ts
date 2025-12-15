import apiClient from '@/lib/api';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AdminData {
  _id: string;
  email: string;
  name: string;
  mobile: string;
  address: string;
  role: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  admin: AdminData;
}

export interface AuthError {
  message: string;
  status?: number;
}

const isBrowser = typeof window !== 'undefined';

// Auth Service Class
class AuthService {
  // Admin Login
  async adminLogin(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/admin/login', credentials);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Manager Login (for future use)
  async managerLogin(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/manager/login', credentials);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Employee Login (for future use)
  async employeeLogin(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/employee/login', credentials);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await apiClient.post('/logout');
    } catch (error: any) {
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearLocalStorage();
    }
  }

  // Get current user data
  getCurrentUser(): AdminData | null {
    if (!isBrowser) return null;
    try {
      const userData = localStorage.getItem('adminData') || localStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  // Get current user role
  getCurrentUserRole(): string | null {
    if (!isBrowser) return null;
    return localStorage.getItem('userRole');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    if (!isBrowser) return false;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken');
    return !!token;
  }

  // Store auth data
  storeAuthData(response: LoginResponse, role: 'admin' | 'manager' | 'employee'): void {
    if (!isBrowser) return;
    const tokenKey = `${role}Token`;
    const dataKey = `${role}Data`;
    
    localStorage.setItem(tokenKey, response.token);
    localStorage.setItem(dataKey, JSON.stringify(response.admin));
    localStorage.setItem('userRole', role);
  }

  // Clear local storage
  clearLocalStorage(): void {
    if (!isBrowser) return;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('managerToken');
    localStorage.removeItem('employeeToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('managerData');
    localStorage.removeItem('employeeData');
    localStorage.removeItem('userRole');
  }

  // Error handler
  private handleError(error: any): AuthError {
    if (error.response) {
      return {
        message: error.response.data?.message || 'Request failed',
        status: error.response.status,
      };
    } else if (error.request) {
      return {
        message: 'No response from server. Please check your connection.',
      };
    } else {
      return {
        message: error.message || 'An unexpected error occurred',
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;

// Utility function to clear all auth tokens and user data
export function clearAllAuthTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('managerToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('managerData');
    localStorage.removeItem('employeeData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('managerName');
    localStorage.removeItem('managerEmail');
    localStorage.removeItem('managerId');
    localStorage.removeItem('employeeId');
  }
} 