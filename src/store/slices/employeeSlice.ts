// store/slices/employeeSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../api/api';

export const fetchEmployees = createAsyncThunk(
  'employee/fetch',
  async (_, thunkAPI) => {
    try {
      const res = await api.fetchEmployees();
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || 'Error');
    }
  }
);

const employeeSlice = createSlice({
  name: 'employee',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default employeeSlice.reducer;
