import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDashboard } from '@/lib/api';

export type DashboardState = {
  totalEmployees: number;
  totalManagers: number;
  workingEmployees: number;
  shiftWise: {
    morning: number;
    night: number;
    [key: string]: number;
  };
  isLoading: boolean;
  error: string | null;
};

const initialState: DashboardState = {
  totalEmployees: 0,
  totalManagers: 0,
  workingEmployees: 0,
  shiftWise: { morning: 0, night: 0 },
  isLoading: false,
  error: null,
};

export const fetchDashboard = createAsyncThunk<any>(
  'dashboard/fetchDashboard',
  async (_, thunkAPI) => {
    try {
      const data: any = await getDashboard();
      // Normalize response for UI
      return {
        totalEmployees: data.totalEmployees ?? 0,
        totalManagers: data.totalManagers ?? 0,
        workingEmployees: data.workingEmployees ?? 0,
        shiftWise: {
          morning: data.shiftWise?.morning ?? 0,
          night: data.shiftWise?.night ?? 0,
          ...data.shiftWise,
        },
      };
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message || 'Failed to fetch dashboard');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.totalEmployees = action.payload.totalEmployees;
        state.totalManagers = action.payload.totalManagers;
        state.workingEmployees = action.payload.workingEmployees;
        state.shiftWise = action.payload.shiftWise;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to fetch dashboard';
      });
  },
});

export default dashboardSlice.reducer; 