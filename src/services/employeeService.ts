import { getEmployees, addManager, updateManager, deleteManager } from '@/lib/api';
import apiClient from '@/lib/api';

export interface AddEmployeePayload {
  name: string;
  email: string;
  createdBy: string;
  isCreatedByAdmin: boolean;
  address: string;
  mobile: string;
  shift: string;
  managerId: string;
}

export interface Employee {
  _id: string;
  name: string;
  email: string;
  createdBy: string;
  isCreatedByAdmin: boolean;
  address: string;
  mobile: string;
  shift: string;
  managerId: string;
  isWorking: boolean;
  image?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface AddEmployeeResponse {
  message: string;
  employee: Employee;
}

class EmployeeService {
  async addEmployee(payload: AddEmployeePayload): Promise<AddEmployeeResponse> {
    const response = await apiClient.post<AddEmployeeResponse>('/employee', payload);
    return response.data;
  }
}

export const employeeService = new EmployeeService();
export default employeeService; 