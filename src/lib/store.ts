import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import adminReducer from '@/store/slices/adminSlice';
import employeeReducer from '@/store/slices/employeeSlice';
import managerReducer from '@/store/slices/managerSlice';
import attendanceReducer from '@/store/slices/attendanceSlice';
import dashboardReducer from '@/store/slices/dashboardSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    admin: adminReducer,
    employee: employeeReducer,
    manager: managerReducer,
    attendance: attendanceReducer,
    dashboard: dashboardReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 