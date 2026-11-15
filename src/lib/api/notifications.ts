import { PaginatedResponse } from "../../constants/types";
import baseApi from "./base_api"
import { apiPath } from "./utils"

export interface DeviceToken {
    uuid: string;
    token: string;
    is_active: boolean;
}

export enum NotificationType {
    SCHEDULE_PUBLISHED = "schedule_published",
    SCHEDULE_ASSIGNED = "schedule_assigned",
    SCHEDULE_REMOVED = "schedule_removed",
    SCHEDULE_GIVEAWAY = "schedule_giveaway",
    SWAP_REQUESTED = "swap_requested",
    SWAP_ACCEPTED = "swap_accepted"
}

export interface Notification {
    uuid: string;
    notification_type: NotificationType;
    title: string;
    body: string;
    data: string;
    read_at: string | null;
    created_at: string;
}

const NOTIFICATION_API_URL = "/notifications/"
const NOTIFICATION_CONSUMER = "ws/notifications/"

export const notificationApi = {
    registerDeviceToken: async (token: string): Promise<DeviceToken> => {
        const response = await baseApi.post<DeviceToken>(apiPath(`${NOTIFICATION_API_URL}device-tokens/`), { device_token: token });
        return response.data;
    },
    getNotifications: async (page: number = 1): Promise<PaginatedResponse<Notification>> => {
        const response = await baseApi.get<PaginatedResponse<Notification>>(apiPath(`${NOTIFICATION_API_URL}`), {
            params: { page },
        });
        return response.data;
    },
    unreadNotificationCount: async (): Promise<{ count: number }> => {
        const response = await baseApi.get<{ count: number }>(apiPath(`${NOTIFICATION_API_URL}unread-count/`));
        return response.data;
    },
    markAllUnreadAsRead: async (): Promise<{ message: string }> => {
        const response = await baseApi.post(apiPath(`${NOTIFICATION_API_URL}mark-all-read/`));
        return response.data;
    }
}