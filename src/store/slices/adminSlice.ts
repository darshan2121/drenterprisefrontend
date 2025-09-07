"use client";

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginAdmin } from '../../lib/api';
import { clearAllAuthTokens } from '@/services/authService';

export interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  mobile?: string;
  address?: string;
  createdAt?: string;
  [key: string]: any;
}

export const loginAdminAction = createAsyncThunk(
  'admin/loginAdmin',
  async (credentials: { email: string; password: string }, thunkAPI) => {
    clearAllAuthTokens();
    try {
      const data = await loginAdmin(credentials);
      console.log("login admin--->",data)
      // @ts-ignore
      if (data?.token && data?.admin) {
        // @ts-ignore
        localStorage.setItem('adminToken', data?.token);
        // @ts-ignore
        localStorage.setItem('adminData', JSON.stringify(data?.admin));
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('adminId', data?.admin?._id);
      }
      console.log('[Redux] loginAdmin fulfilled:', data?.admin);
      return data?.admin;
    } catch (error: any) {
      console.log("login admin error --->", {
        message: error?.message,
        code: error?.code,
        response: error?.response,
        responseData: error?.response?.data,
        responseStatus: error?.response?.status,
        stack: error?.stack,
      });
    
      // alert(error?.response?.data?.message || 'Login failed');
    
      return thunkAPI.rejectWithValue(error?.message||error?.response?.data?.message || 'Login failed');
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