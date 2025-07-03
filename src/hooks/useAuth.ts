import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState, AppDispatch } from '@/store';
import { 
  adminLogin, 
  managerLogin, 
  logout, 
  clearError,
  setUser
} from '@/store/slices/authSlice';
import { LoginCredentials } from '@/services/authService';
import { authService } from '@/services/authService';
import { useEffect } from 'react';

// Custom hook for authentication
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  
  // Select auth state
  const auth = useSelector((state: RootState) => state.auth);

  // Rehydrate auth state from localStorage on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = authService.getCurrentUser();
      if (user) {
        dispatch(setUser(user));
      }
    }
  }, [dispatch]);

  // Login functions
  const loginAsAdmin = async (credentials: LoginCredentials) => {
    try {
      const result = await dispatch(adminLogin(credentials)).unwrap();
      router.push('/admin/dashboard');
      return result;
    } catch (error) {
      throw error;
    }
  };

  const loginAsManager = async (credentials: LoginCredentials) => {
    try {
      const result = await dispatch(managerLogin(credentials)).unwrap();
      router.push('/manager/dashboard');
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Logout function
  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if logout API fails
      router.push('/admin/login');
    }
  };

  // Clear error
  const clearAuthError = () => {
    dispatch(clearError());
  };

  // Check if user has specific role
  const hasRole = (role: string) => {
    return auth.role === role;
  };

  // Check if user is admin
  const isAdmin = () => {
    return auth.role === 'admin';
  };

  // Check if user is manager
  const isManager = () => {
    return auth.role === 'manager';
  };

  return {
    // State
    user: auth.user,
    token: auth.token,
    role: auth.role,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,

    // Actions
    loginAsAdmin,
    loginAsManager,
    logout: handleLogout,
    clearError: clearAuthError,

    // Helpers
    hasRole,
    isAdmin,
    isManager,
  };
}; 