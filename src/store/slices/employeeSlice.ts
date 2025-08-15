// store/slices/employeeSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getEmployees, addEmployee as apiAddEmployee, updateEmployee as apiUpdateEmployee, deleteEmployee as apiDeleteEmployee, addEmployeeByManager as apiAddEmployeeByManager } from '@/lib/api';

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

export interface AddEmployeeResponse {
  message: string;
  employee: Employee;
}

export const fetchEmployees = createAsyncThunk<Employee[]>(
  'employee/fetch',
  async (_, thunkAPI) => {
    try {
      const res: any = await getEmployees();
      // Normalize if needed
      return (res.data || []) as Employee[];
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message || 'Error');
    }
  }
);

export const addEmployee = createAsyncThunk<AddEmployeeResponse, AddEmployeePayload>(
  'employee/addEmployee',
  async (payload, { rejectWithValue }) => {
    try {
      const res: any = await apiAddEmployee(payload);
      return res as AddEmployeeResponse;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add employee');
    }
  }
);

export const editEmployee = createAsyncThunk<Employee, { id: string; body: Partial<Employee> }>(
  'employee/editEmployee',
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const res: any = await apiUpdateEmployee(id, body);
      return res.employee as Employee;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update employee');
    }
  }
);

export const removeEmployee = createAsyncThunk<string, { id: string }>(
  'employee/removeEmployee',
  async ({ id }, { rejectWithValue }) => {
    try {
      await apiDeleteEmployee(id); // no body if backend doesn't expect it
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete employee');
    }
  }
);

export const addEmployeeByManager = createAsyncThunk<AddEmployeeResponse, Omit<AddEmployeePayload, 'managerId' | 'createdBy' | 'isCreatedByAdmin'> & { shift: string; address: string; mobile: string; email: string; name: string }>(
  'employee/addEmployeeByManager',
  async (payload, { rejectWithValue }) => {
    try {
      const res: any = await apiAddEmployeeByManager(payload);
      return res as AddEmployeeResponse;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add employee');
    }
  }
);

interface EmployeeState {
  employees: Employee[];
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: EmployeeState = {
  employees: [],
  isLoading: false,
  error: null,
  successMessage: null,
};

const employeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    clearEmployeeError: (state) => { state.error = null; },
    clearEmployeeSuccess: (state) => { state.successMessage = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(addEmployee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(addEmployee.fulfilled, (state, action: PayloadAction<AddEmployeeResponse>) => {
        state.isLoading = false;
        state.successMessage = action.payload.message;
        state.employees.push(action.payload.employee);
      })
      .addCase(addEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(editEmployee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(editEmployee.fulfilled, (state, action: PayloadAction<Employee>) => {
        state.isLoading = false;
        state.employees = state.employees.map(emp => emp._id === action.payload._id ? action.payload : emp);
      })
      .addCase(editEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(removeEmployee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeEmployee.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false;
        state.employees = state.employees.filter(emp => emp._id !== action.payload);
      })
      .addCase(removeEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(addEmployeeByManager.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(addEmployeeByManager.fulfilled, (state, action: PayloadAction<AddEmployeeResponse>) => {
        state.isLoading = false;
        state.successMessage = action.payload.message;
        state.employees.push(action.payload.employee);
      })
      .addCase(addEmployeeByManager.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearEmployeeError, clearEmployeeSuccess } = employeeSlice.actions;
export default employeeSlice.reducer;
