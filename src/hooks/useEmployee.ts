import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { addEmployee, clearEmployeeError, clearEmployeeSuccess } from '@/store/slices/employeeSlice';
import { AddEmployeePayload } from '@/services/employeeService';

export const useEmployee = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { employees, isLoading, error, successMessage } = useSelector((state: RootState) => state.employee);

  const handleAddEmployee = async (payload: AddEmployeePayload) => {
    return dispatch(addEmployee(payload)).unwrap();
  };

  return {
    employees,
    isLoading,
    error,
    successMessage,
    addEmployee: handleAddEmployee,
    clearEmployeeError: () => dispatch(clearEmployeeError()),
    clearEmployeeSuccess: () => dispatch(clearEmployeeSuccess()),
  };
}; 