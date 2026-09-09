import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { scheduleApi } from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { PeopleOnFloorSection } from './PeopleOnFloorSection';

// The "People On the Floor" tab's content — owns its own query
// (scheduleApi.onGoingShift(), the real "who's actually checked in right
// now" endpoint). HomeScreen only mounts this panel while this tab is
// selected, so mounting itself is the fetch trigger; no `enabled` flag
// needed the way the old inline-in-HomeScreen version needed one.
export function PeopleOnFloorPanel() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['schedules', 'floor'],
    queryFn: () => scheduleApi.onGoingShift(),
  });
  const schedules = data?.results ?? [];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>People on the Floor</Text>
      {isPending ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : isError ? (
        <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load who is on the floor.')}</Text>
      ) : (
        <PeopleOnFloorSection schedules={schedules} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.gutter,
  },
  sectionTitle: {
    ...Typography.headlineLgMobile,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.onSurface,
  },
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
});
