import { MaterialIcons } from '@expo/vector-icons';
import { NotificationType } from '../../lib/api/notifications';

// One icon per notification type — falls back to a generic bell for any
// type the backend adds later that this list doesn't know about yet.
const ICON_BY_TYPE: Record<NotificationType, keyof typeof MaterialIcons.glyphMap> = {
  [NotificationType.SCHEDULE_PUBLISHED]: 'campaign',
  [NotificationType.SCHEDULE_ASSIGNED]: 'event-available',
  [NotificationType.SCHEDULE_REMOVED]: 'event-busy',
  [NotificationType.SCHEDULE_GIVEAWAY]: 'card-giftcard',
  [NotificationType.SWAP_REQUESTED]: 'swap-horiz',
  [NotificationType.SWAP_ACCEPTED]: 'swap-horizontal-circle',
};

export function notificationIcon(type: NotificationType): keyof typeof MaterialIcons.glyphMap {
  return ICON_BY_TYPE[type] ?? 'notifications';
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Nov 3, 14:16" — matches schedule-format.ts's day-then-month convention,
// with a time component since activity rows need to disambiguate same-day
// notifications too.
export function formatNotificationTimestamp(iso: string): string {
  const date = new Date(iso);
  const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}, ${time}`;
}
