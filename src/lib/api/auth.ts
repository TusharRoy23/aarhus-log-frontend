import baseApi, { apiPath } from './base_api';

export type RegisterPayload = {
    email: string;
    password: string;
    confirm_password: string;
    first_name: string;
    last_name: string;
    organization: string;
};

type registerMsgResponse = {
    status: string;
    msg: string;
};

export type LoginLookupPayload = {
    email: string;
    password: string;
};

export type LoginPayload = {
    username: string;
    password: string;
    organization_uuid: string;
}

export type Organization = {
    uuid: string;
    name: string;
    designation?: string;
}

export type User = {
    username: string;
    email: string;
    name?: string;
}

export type LoginLookupResponse = {
    organizations: Organization[];
}

export type LoginResponse = {
    refresh: string;
    access: string;
    user: User;
    organization: Organization;
}

export const authApi = {
    register: async (payload: RegisterPayload) => {
        const response = await baseApi.post<registerMsgResponse>(apiPath('/user/register/'), payload)
        return response.data;
    },
    loginLookup: async (payload: LoginLookupPayload): Promise<LoginLookupResponse> => {
        const response = await baseApi.post<LoginLookupResponse>(apiPath('/user/login-lookup/'), payload);
        return response.data;
    },
    login: async (payload: LoginPayload): Promise<LoginResponse> => {
        const response = await baseApi.post<LoginResponse>(apiPath('/user/login/'), payload);
        return response.data;
    },
    logout: async (): Promise<void> => {
        await baseApi.post(apiPath('/user/logout/'));
    },
};
