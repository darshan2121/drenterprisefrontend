import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { clockInAttendance, clockOutAttendance, updateAttendance } from '@/lib/api';
import { http } from '@/lib/http';
import { ENDPOINTS } from '@/lib/endpoints';

export type Attendance = {
  id: string;
  date: string;
  employee: string;
  shift: string;
  location: string;
  status: 'Present' | 'Absent' | 'On Leave';
  clockIn: string;
  clockOut: string;
};

// export const fetchAttendance = createAsyncThunk<Attendance[]>(
//   'attendance/fetchAttendance',
//   async (_, thunkAPI) => {
//     try {
//       const res: any = await getAttendance();
//       // Normalize API response to Attendance[] for ReportsTable
//       return (res.attendance || []).map((a: any) => ({
//         id: a._id,
//         date: a.stepIn ? new Date(a.stepIn).toLocaleDateString() : '',
//         employee: a.employeeId?.name || '',
//         shift: a.employeeId?.shift || '',
//         location: a.address || '',
//         status: a.stepOut ? 'Present' : 'Absent', // or use your own logic
//         clockIn: a.stepIn ? new Date(a.stepIn).toLocaleTimeString() : '',
//         clockOut: a.stepOut ? new Date(a.stepOut).toLocaleTimeString() : '',
//       }));
//     } catch (err: any) {
//       return thunkAPI.rejectWithValue(err.message || 'Failed to fetch attendance');
//     }
//   }
// );

export const clockIn = createAsyncThunk<any, FormData>(
  'attendance/clockIn',
  async (formData, thunkAPI) => {
    try {
      console.log('[AttendanceSlice] Clock in request data:', {
        employeeId: formData.get('employeeId'),
        latitude: formData.get('latitude'),
        longitude: formData.get('longitude'),
        address: formData.get('address'),
        shift: formData.get('shift'),
        hasImage: !!formData.get('stepInImage')
      });
      
      const res = await clockInAttendance(formData);
      console.log('[AttendanceSlice] Clock in success:', res);
      return res;
    } catch (err: any) {
      console.error('[AttendanceSlice] Clock in error:', err);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to clock in';
      
      if (err.message) {
        if (err.message.includes('401')) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (err.message.includes('403')) {
          errorMessage = 'Access denied. You may not have permission to clock in.';
        } else if (err.message.includes('404')) {
          errorMessage = 'Employee not found. Please contact your administrator.';
        } else if (err.message.includes('409')) {
          errorMessage = 'Already clocked in today. Cannot clock in again.';
        } else if (err.message.includes('422')) {
          errorMessage = 'Invalid data provided. Please check your location and try again.';
        } else if (err.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        } else if (err.message.includes('Network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = err.message;
        }
      }
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

export const clockOut = createAsyncThunk<any, FormData>(
  'attendance/clockOut',
  async (formData, thunkAPI) => {
    try {
      console.log('[AttendanceSlice] Clock out request data:', {
        attendanceId: formData.get('attendanceId'),
        latitude: formData.get('latitude'),
        longitude: formData.get('longitude'),
        address: formData.get('address')
      });
      
      const res = await clockOutAttendance(formData);
      console.log('[AttendanceSlice] Clock out success:', res);
      return res;
    } catch (err: any) {
      console.error('[AttendanceSlice] Clock out error:', err);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to clock out';
      
      if (err.message) {
        if (err.message.includes('401')) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (err.message.includes('403')) {
          errorMessage = 'Access denied. You may not have permission to clock out.';
        } else if (err.message.includes('404')) {
          errorMessage = 'Attendance record not found. Please contact your administrator.';
        } else if (err.message.includes('409')) {
          errorMessage = 'Already clocked out today. Cannot clock out again.';
        } else if (err.message.includes('422')) {
          errorMessage = 'Invalid data provided. Please check your location and try again.';
        } else if (err.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        } else if (err.message.includes('Network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = err.message;
        }
      }
      
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

export const updateAttendanceRecord = createAsyncThunk<any, { id: string, data: any }>(
  'attendance/updateAttendanceRecord',
  async ({ id, data }, thunkAPI) => {
    try {
      const res = await updateAttendance(id, data);
      return res;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message || 'Failed to update attendance');
    }
  }
);

export const fetchAttendanceId = createAsyncThunk<{ employeeId: string, attendanceId: string | null, attendanceRecord?: any }, string>(
  'attendance/fetchAttendanceId',
  async (employeeId, thunkAPI) => {
    try {
      const res = await http<{ attendance: any[] }>(ENDPOINTS.attendance.byEmployee(employeeId));
      let attendanceId: string | null = null;
      let attendanceRecord: any | null = null;
      if (res && res.attendance && res.attendance.length > 0) {
        // Find open attendance (no stepOut)
        const openAttendance = res.attendance.find((a: any) => !a.stepOut);
        if (openAttendance) {
          attendanceId = openAttendance._id;
          attendanceRecord = openAttendance;
        } else {
          // If no open attendance, use the most recent attendance (last in sorted array)
          attendanceRecord = res.attendance[res.attendance.length - 1];
        }
      }
      return { employeeId, attendanceId, attendanceRecord };
    } catch (err: any) {
      return thunkAPI.rejectWithValue('Failed to fetch attendanceId');
    }
  }
);

export const fetchAllAttendance = createAsyncThunk<any[], void>(
  'attendance/fetchAllAttendance',
  async (_, thunkAPI) => {
    try {
      const res = await http<{ attendance: any[] }>(ENDPOINTS.attendance.all);
      if (!res) throw new Error('Failed to fetch attendance');
      return res.attendance || [];
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message || 'Failed to fetch attendance');
    }
  }
);

export const fetchAttendance = createAsyncThunk<any[], {
  managerId?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  order?: string;
}>(
  'attendance/fetchAttendance',
  async (params, thunkAPI) => {
    try {
      const query = new URLSearchParams();
      if (params.managerId) query.append('managerId', params.managerId);
      if (params.employeeId) query.append('employeeId', params.employeeId);
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      if (params.order) query.append('order', params.order);
      const url = `${ENDPOINTS.attendance.all}?${query.toString()}`;
      console.log('[FRONTEND] fetchAttendance URL:', url);
      console.log('[FRONTEND] fetchAttendance params:', params);
      const res = await http<{ attendance: any[] }>(url);
      return res.attendance || [];
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message || 'Failed to fetch attendance');
    }
  }
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: { 
    isClockingIn: false, 
    isClockingOut: false, 
    error: null as string | null, 
    attendanceIds: {} as Record<string, string | null>, 
    attendanceRecords: {} as Record<string, any | null>, 
    attendanceList: [] as any[], 
    isLoadingAttendance: false,
    isUpdating: false
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(clockIn.pending, (state) => { state.isClockingIn = true; state.error = null; })
      .addCase(clockIn.fulfilled, (state) => { state.isClockingIn = false; })
      .addCase(clockIn.rejected, (state, action) => { state.isClockingIn = false; state.error = action.payload as string; })
      .addCase(clockOut.pending, (state) => { state.isClockingOut = true; state.error = null; })
      .addCase(clockOut.fulfilled, (state) => { state.isClockingOut = false; })
      .addCase(clockOut.rejected, (state, action) => { state.isClockingOut = false; state.error = action.payload as string; })
      .addCase(updateAttendanceRecord.pending, (state) => { 
        state.isUpdating = true; 
        state.error = null; 
      })
      .addCase(updateAttendanceRecord.fulfilled, (state, action) => { 
        state.isUpdating = false;
        // Optionally update the specific record in the list
        const { id, data } = action.payload;
        const index = state.attendanceList.findIndex(record => record._id === id);
        if (index !== -1) {
          // Update the record with new data
          state.attendanceList[index] = { ...state.attendanceList[index], ...data };
        }
      })
      .addCase(updateAttendanceRecord.rejected, (state, action) => { 
        state.isUpdating = false; 
        state.error = action.payload as string; 
      })
      .addCase(fetchAttendanceId.fulfilled, (state, action) => {
        state.attendanceIds[action.payload.employeeId] = action.payload.attendanceId;
        // Store the open attendance record (with image) for this employee
        state.attendanceRecords[action.payload.employeeId] = action.payload.attendanceRecord || null;
      })
      .addCase(fetchAllAttendance.pending, (state) => { state.isLoadingAttendance = true; state.error = null; })
      .addCase(fetchAllAttendance.fulfilled, (state, action) => {
        state.isLoadingAttendance = false;
        state.attendanceList = action.payload;
      })
      .addCase(fetchAllAttendance.rejected, (state, action) => {
        state.isLoadingAttendance = false;
        state.error = action.payload as string;
      })
      .addCase(fetchAttendance.pending, (state) => { state.isLoadingAttendance = true; state.error = null; })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.isLoadingAttendance = false;
        state.attendanceList = action.payload;
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.isLoadingAttendance = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearError } = attendanceSlice.actions;
export default attendanceSlice.reducer;