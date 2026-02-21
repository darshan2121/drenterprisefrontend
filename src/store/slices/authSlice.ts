"use client";

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginManager as apiLoginManager } from '../../lib/api';
import { clearAllAuthTokens } from '@/services/authService';

interface ManagerLoginResponse {
  message: string;
  token: string;
  manager: {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
    [key: string]: any;
  };
}

export const loginManager = createAsyncThunk(
  'auth/loginManager',
  async (credentials: { email: string; password: string }, thunkAPI) => {
    clearAllAuthTokens();
    const data = await apiLoginManager(credentials) as ManagerLoginResponse;
    if (data.token && data.manager) {
      localStorage.setItem('managerToken', data.token);
      localStorage.setItem('managerData', JSON.stringify(data.manager));
      localStorage.setItem('userRole', 'manager');
      localStorage.setItem('managerName', data.manager.name);
      localStorage.setItem('managerEmail', data.manager.email);
      localStorage.setItem('managerId', data.manager._id);
      if (data.manager.employeeId) {
        localStorage.setItem('employeeId', data.manager.employeeId);
      }
    }
    console.log('[Redux] loginManager fulfilled:', data.manager);
    return data.manager;
  }
);

const initialState: {
  manager: ManagerLoginResponse['manager'] | null,
  isLoading: boolean,
  error: string | null
} = {
  manager: null,
  isLoading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.manager = null;
      clearAllAuthTokens();
      localStorage.removeItem('managerToken');
      localStorage.removeItem('managerData');
      localStorage.removeItem('userRole');
      localStorage.removeItem('managerName');
      localStorage.removeItem('managerEmail');
      localStorage.removeItem('managerId');
      localStorage.removeItem('employeeId');
      console.log('[Redux] logout');
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginManager.pending, (state) => { state.isLoading = true; console.log('[Redux] loginManager pending'); })
      .addCase(loginManager.fulfilled, (state, action) => {
        state.isLoading = false;
        state.manager = action.payload;
        console.log('[Redux] loginManager success:', action.payload);
      })
      .addCase(loginManager.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || null;
        console.log('[Redux] loginManager error:', action.error.message);
      });
  }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer; 