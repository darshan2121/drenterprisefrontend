import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState, AppDispatch } from '@/store';
import { 
  loginManager, 
  logout as managerLogout
} from '@/store/slices/authSlice';
import { 
  loginAdminAction, 
  logout as adminLogout, 
  clearError as adminClearError
} from '@/store/slices/adminSlice';
import { LoginCredentials } from '@/services/authService';
import { authService } from '@/services/authService';
import { useEffect } from 'react';

// Custom hook for authentication
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  
  // Select auth state
  const auth = useSelector((state: RootState) => state.auth);
  const admin = useSelector((state: RootState) => state.admin);

  // Rehydrate auth state from localStorage on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = authService.getCurrentUser();
      // Optionally, dispatch setUser if you have it
      // dispatch(setUser(user));
    }
  }, [dispatch]);

  // Login functions
  const loginAsAdmin = async (credentials: LoginCredentials) => {
    try {
      const result = await dispatch(loginAdminAction(credentials)).unwrap();
      router.push('/admin/dashboard');
      return result;
    } catch (error) {
      throw error;
    }
  };

  const loginAsManager = async (credentials: LoginCredentials) => {
    try {
      const result = await dispatch(loginManager(credentials)).unwrap();
      router.push('/manager/dashboard');
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Logout function (handles both admin and manager)
  const handleLogout = async () => {
    try {
      const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
      if (role === 'manager') {
        dispatch(managerLogout());
        router.push('/login');
      } else {
        dispatch(adminLogout());
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
      if (role === 'manager') {
        router.push('/login');
      } else {
        router.push('/admin/login');
      }
    }
  };

  // Clear error (only for admin, since manager does not have clearError)
  const clearAuthError = () => {
    dispatch(adminClearError());
  };

  // Check if user has specific role
  const hasRole = (role: string) => {
    return typeof window !== 'undefined' ? localStorage.getItem('userRole') === role : false;
  };

  // Check if user is admin
  const isAdmin = () => {
    return typeof window !== 'undefined' ? localStorage.getItem('userRole') === 'admin' : false;
  };

  // Check if user is manager
  const isManager = () => {
    return typeof window !== 'undefined' ? localStorage.getItem('userRole') === 'manager' : false;
  };

  const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const token = typeof window !== 'undefined' ? localStorage.getItem('managerToken') : null;
  const user = auth.manager || admin.admin;

  return {
    // State
    user,
    token,
    role,
    isLoading: auth.isLoading,
    error: auth.error,

    // Actions
    loginAsAdmin,
    loginAsManager,
    logout: handleLogout,
    clearError: clearAuthError,

    // Helpers
    hasRole: (r: string) => role === r,
    isAdmin: () => role === 'admin',
    isManager: () => role === 'manager',
  };
};