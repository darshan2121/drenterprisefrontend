"use client";

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginAdmin } from '../../lib/api';
import { clearAllAuthTokens } from '@/services/authService';

export interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
  [key: string]: any;
}

export const loginAdminAction = createAsyncThunk(
  'admin/loginAdmin',
  async (credentials: { email: string; password: string }, thunkAPI) => {
    clearAllAuthTokens();
    try {
      const data = await loginAdmin(credentials);
      console.log("login admin--->",data)
      if (data?.message === "Login successful" && data.token) {
        localStorage.setItem('adminToken', data?.token);
        localStorage.setItem('adminData', JSON.stringify(data?.admin));
        localStorage.setItem('userRole', 'admin');
      }
      console.log('[Redux] loginAdmin fulfilled:', data?.admin);
      return data?.admin;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState: { 
    admin: null as Admin | null, 
    isLoading: false, 
    error: null as string | null 
  },
  reducers: {
    logout: (state) => {
      state.admin = null;
      clearAllAuthTokens();
      console.log('[Redux] admin logout');
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAdminAction.pending, (state) => { 
        state.isLoading = true; 
        state.error = null;
        console.log('[Redux] loginAdmin pending'); 
      })
      .addCase(loginAdminAction.fulfilled, (state, action) => {
        state.isLoading = false;
        state.admin = action.payload;
        console.log('[Redux] loginAdmin success:', action.payload);
      })
      .addCase(loginAdminAction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Login failed';
        console.log('[Redux] loginAdmin error:', action.payload);
      });
  }
});

export const { logout, clearError } = adminSlice.actions;
export default adminSlice.reducer; 