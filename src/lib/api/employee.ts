import baseApi from './base_api';
import { Designation } from './designation';
import { apiPath } from './utils';

export type Employee = {
    uuid: string;
    first_name: string;
    last_name: string;
    email: string;
    employee_code: string;
    is_active: boolean;
    is_invited: boolean;
    designation: Designation;
    start_date: string;
    end_date: string | null;
    created_at: string;
    updated_at: string;
};

export type EmployeeListResponse = {
    results: Employee[];
    count: number;
};

export type CreateEmployeePayload = {
    email: string;
    first_name: string;
    last_name: string;
    designation_uuid: string;
    start_date: string;
    end_date?: string;
};

export type UpdateEmployeePayload = CreateEmployeePayload & {
    is_active: boolean;
};

const EMPLOYEES_PATH = '/employee/';

export const employeeApi = {
    list: async (): Promise<EmployeeListResponse> => {
        const response = await baseApi.get<EmployeeListResponse>(apiPath(EMPLOYEES_PATH));
        return response.data;
    },
    create: async (payload: CreateEmployeePayload): Promise<Employee> => {
        const response = await baseApi.post<Employee>(apiPath(EMPLOYEES_PATH), payload);
        return response.data;
    },
    update: async (uuid: string, payload: UpdateEmployeePayload): Promise<Employee> => {
        const response = await baseApi.put<Employee>(apiPath(`${EMPLOYEES_PATH}${uuid}/`), payload);
        return response.data;
    },
    invite: async (email: string): Promise<{ message: string }> => {
        const response = await baseApi.post(apiPath(`${EMPLOYEES_PATH}invite/`), { email });
        return response.data;
    }
};
