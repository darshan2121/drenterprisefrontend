import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addManager, updateManager, deleteManager } from '@/lib/api';
import type { AppDispatch } from '../index';
import { getManagers } from '@/lib/api';
export type Manager = {
  _id: string;
  name: string;
  email: string;
  teamSize?: number;
  status?: string;
  location?: string;
  address?: string;
  isActive?: boolean;
  [key: string]: any;
};

export const fetchManagers = createAsyncThunk<Manager[]>('manager/fetchManagers', async () => {
  const data: any = await getManagers();

  console.log('[Redux] fetchManagers fulfilled:', data);
  // Normalize each manager object
  return (data.data || []).map((m: any) => ({
    _id: m._id,
    name: m.name,
    email: m.email,
    teamSize: typeof m.teamSize === 'number' ? m.teamSize : 0,
    status: m.status || (m.isActive ? 'Active' : 'Inactive'),
    location: m.location || m.address || '',
    address: m.address || '',
    isActive: typeof m.isActive === 'boolean' ? m.isActive : (m.status === 'Active'),
    ...m,
  })) as Manager[];
});

export const createManager = createAsyncThunk<Manager, any>('manager/createManager', async (body) => {
  const data: any = await addManager(body);
  console.log('[Redux] createManager fulfilled:', data);
  return data.manager as Manager;
});

export const editManager = createAsyncThunk<Manager, { id: string, body: any }, { dispatch: AppDispatch }>(
  'manager/editManager',
  async ({ id, body }, { dispatch }) => {
    const data: any = await updateManager(id, body);
    console.log('[Redux] editManager fulfilled:', data);
    // After edit, re-fetch the managers list to ensure state is up to date
    dispatch(fetchManagers());
    return data.manager as Manager;
  }
);

export const removeManager = createAsyncThunk<string, { id: string, body: any }>('manager/removeManager', async ({ id, body }) => {
  const data: any = await deleteManager(id, body);
  console.log('[Redux] removeManager fulfilled:', data);
  return id;
});

const managerSlice = createSlice({
  name: 'manager',
  initialState: { managers: [] as Manager[], isLoading: false, error: null as string | null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchManagers.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchManagers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.managers = action.payload;
      })
      .addCase(fetchManagers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || null;
      })
      .addCase(createManager.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(createManager.fulfilled, (state, action) => {
        state.isLoading = false;
        state.managers.push(action.payload);
      })
      .addCase(createManager.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || null;
      })
      .addCase(editManager.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(editManager.fulfilled, (state, action) => {
        state.isLoading = false;
        // No need to update a single manager, fetchManagers will refresh the list
      })
      .addCase(editManager.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || null;
      })
      .addCase(removeManager.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(removeManager.fulfilled, (state, action) => {
        state.isLoading = false;
        state.managers = state.managers.filter((m) => m._id !== action.payload);
      })
      .addCase(removeManager.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || null;
      });
  }
});

export default managerSlice.reducer; 