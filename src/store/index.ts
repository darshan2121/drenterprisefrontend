import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import employeeReducer from './slices/employeeSlice';
import managerReducer from './slices/managerSlice';
import dashboardReducer from './slices/dashboardSlice';
import adminReducer from './slices/adminSlice';
import attendanceReducer from './slices/attendanceSlice';

// Root state type
export interface RootState {
  auth: ReturnType<typeof authReducer>;
  employee: ReturnType<typeof employeeReducer>;
  manager: ReturnType<typeof managerReducer>;
  dashboard: ReturnType<typeof dashboardReducer>;
  admin: ReturnType<typeof adminReducer>;
  attendance: ReturnType<typeof attendanceReducer>;
}

// Placeholder reducer
const dummyReducer = (state = {}, action: any) => state;

// Store configuration
const store = configureStore({
  reducer: {
    auth: authReducer,
    employee: employeeReducer,
    manager: managerReducer,
    dashboard: dashboardReducer,
    admin: adminReducer,
    attendance: attendanceReducer,
    dummy: dummyReducer,
    // Add other slices here as needed
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

console.log('[Redux] Store created:', store.getState());

// Export types
export type AppDispatch = typeof store.dispatch;
export type AppState = ReturnType<typeof store.getState>;

export default store;
