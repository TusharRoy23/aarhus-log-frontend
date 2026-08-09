import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { EmployeeStatus } from '../../theme/status';

// There's no employees API yet — this slice is a local, mutable stand-in for
// one (seeded with sample data) so Team Directory / Add / Edit can share and
// mutate a real list across screens. Swap for TanStack Query once a real API
// exists; don't build a second, parallel data source in the meantime.

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string;
  status: EmployeeStatus;
};

export type NewEmployeeInput = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string;
};

export type EmployeeUpdateInput = { id: string } & NewEmployeeInput;

type EmployeesState = {
  items: Employee[];
};

const initialState: EmployeesState = {
  items: [
    {
      id: '1',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'sarah.jenkins@example.com',
      role: 'Security Lead',
      status: 'active',
    },
    {
      id: '2',
      firstName: 'Marcus',
      lastName: 'Reed',
      email: 'marcus.reed@example.com',
      role: 'Facility Manager',
      status: 'pending-invite',
    },
    {
      id: '3',
      firstName: 'Elena',
      lastName: 'Rodriguez',
      email: 'elena.rodriguez@example.com',
      role: 'Operations Analyst',
      status: 'active',
    },
    {
      id: '4',
      firstName: 'David',
      lastName: 'Wu',
      email: 'david.wu@example.com',
      role: 'IT Support',
      status: 'active',
    },
  ],
};

const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    // Adding an employee sends their invite immediately (matches the source
    // design — a newly-added employee shows up as "Pending Invite" right
    // away, same as the seeded Marcus Reed).
    addEmployee: {
      reducer: (state, action: PayloadAction<Employee>) => {
        state.items.unshift(action.payload);
      },
      prepare: (input: NewEmployeeInput) => ({
        payload: {
          ...input,
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: 'pending-invite' as const,
        },
      }),
    },
    updateEmployee: (state, action: PayloadAction<EmployeeUpdateInput>) => {
      const employee = state.items.find((item) => item.id === action.payload.id);
      if (employee) {
        Object.assign(employee, action.payload);
      }
    },
  },
});

export const { addEmployee, updateEmployee } = employeesSlice.actions;
export default employeesSlice.reducer;
