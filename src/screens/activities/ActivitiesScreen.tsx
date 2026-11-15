import { useEffect, useRef } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { Notification, notificationApi } from '../../lib/api/notifications';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { notificationIcon, formatNotificationTimestamp } from './activity-format';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearUnreadCount } from '../../store/slices/notifications-slice';

function ActivityRow({ notification }: { notification: Notification }) {
  const isUnread = !notification.read_at;

  return (
    <View style={styles.item}>
      <View style={[styles.iconBadge, isUnread && styles.iconBadgeUnread]}>
        <MaterialIcons
          name={notificationIcon(notification.notification_type)}
          size={20}
          color={isUnread ? Colors.onPrimary : Colors.onSurfaceVariant}
        />
      </View>

      <View style={styles.itemBody}>
        <Text style={[styles.itemTitle, isUnread && styles.itemTitleUnread]} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={styles.itemText} numberOfLines={2}>
          {notification.body}
        </Text>
      </View>

      <Text style={styles.itemTimestamp}>{formatNotificationTimestamp(notification.created_at)}</Text>
    </View>
  );
}

export function ActivitiesScreen() {
  const dispatch = useAppDispatch();
  const unreadCount = useAppSelector((state) => state.notifications.unreadCount);

  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => notificationApi.getNotifications(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.next ? allPages.length + 1 : undefined),
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationApi.markAllUnreadAsRead,
    onSuccess: () => dispatch(clearUnreadCount()),
  });

  // Fires once the list has actually rendered (first page settled), not
  // before — marking everything read shouldn't race with or precede the
  // user seeing what they're reading. Skips the call entirely when there's
  // nothing unread, per the badge count already tracked in Redux. `hasRun`
  // guards against re-firing on pagination (fetchNextPage doesn't flip
  // `isPending`) or re-renders.
  const hasRun = useRef(false);
  useEffect(() => {
    if (!isPending && !isError && !hasRun.current) {
      hasRun.current = true;
      if (unreadCount > 0) {
        markAllReadMutation.mutate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, isError]);

  const notifications = data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <AppShell>
      <FlatList
        data={notifications}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Activity</Text>
          </View>
        }
        renderItem={({ item }) => <ActivityRow notification={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator color={Colors.primary} style={styles.footerLoading} /> : null
        }
        ListEmptyComponent={
          isPending ? (
            <ActivityIndicator color={Colors.primary} style={styles.loading} />
          ) : isError ? (
            <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load activity.')}</Text>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No activity yet.</Text>
            </View>
          )
        }
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: Spacing.containerPaddingMobile,
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing.gutter,
  },
  title: {
    ...Typography.headlineLgMobile,
    color: Colors.onSurface,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.unit * 3,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
  },
  separator: {
    height: Spacing.unit * 2,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeUnread: {
    backgroundColor: Colors.primary,
  },
  itemBody: {
    flex: 1,
    gap: Spacing.unit,
  },
  itemTitle: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  itemTitleUnread: {
    fontFamily: 'Inter_600SemiBold',
  },
  itemText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  itemTimestamp: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    flexShrink: 0,
  },
  loading: {
    marginTop: Spacing.sectionGap,
  },
  footerLoading: {
    marginVertical: Spacing.gutter,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
  },
  emptyText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
});
