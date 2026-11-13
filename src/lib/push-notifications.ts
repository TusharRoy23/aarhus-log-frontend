import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { notificationApi } from './api/notifications';

// Decides how a notification is presented while the app is in the
// foreground. Called once at import time so it's active before login even
// happens — mirrors expo-notifications' own documented setup pattern.
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Requests permission, grabs an Expo push token, and registers it with the
// backend. Fire-and-forget by design — called from login and from app
// bootstrap (restart while already authenticated), neither of which should
// ever be blocked or interrupted by a push-notification failure.
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') {
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await notificationApi.registerDeviceToken(token);
  } catch (error) {
    console.warn('Failed to register for push notifications', error);
  }
}
