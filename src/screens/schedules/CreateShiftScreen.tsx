import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { employeeApi } from '../../lib/api/employee';
import { scheduleApi, type CreateSchedulePayload, type ScheduleListResponse } from '../../lib/api/schedule';
import { workLocationApi } from '../../lib/api/work-location';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { CreateShiftForm, type CreateShiftFormValues } from './CreateShiftForm';

// DateTimeField (mode="datetime") hands back local wall-clock time as
// 'YYYY-MM-DDTHH:MM' (no seconds/offset). `new Date(...)` parses a
// date-time string without an offset as local time, so `.toISOString()`
// correctly converts it to the UTC 'Z' format the API expects — just strip
// the milliseconds `new Date` always includes to match the confirmed
// payload shape exactly.
function toApiDateTime(localValue: string): string {
  return new Date(localValue).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function toBreakTimeString(minutesInput: string): string {
  const totalMinutes = parseInt(minutesInput, 10) || 0;
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

export function CreateShiftScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: employeeData, isPending: isEmployeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeApi.list,
  });
  const employeeOptions = (employeeData?.results ?? []).map((employee) => ({
    label: `${employee.first_name} ${employee.last_name}`,
    value: employee.uuid,
  }));

  const { data: workLocationData, isPending: isWorkLocationsLoading } = useQuery({
    queryKey: ['work-locations'],
    queryFn: workLocationApi.list,
  });
  const workLocationOptions = (workLocationData?.results ?? [])
    .filter((location) => location.is_active)
    .map((location) => ({ label: `${location.name} (${location.client_name})`, value: location.uuid }));

  const createMutation = useMutation({
    mutationFn: scheduleApi.create,
    onSuccess: (created) => {
      // Same cache-write pattern as Designations/Employees — the API hands
      // back the full created record, so prepend it directly rather than
      // refetching. (No screen reads the `['schedules']` cache yet, but
      // this keeps it correct for whenever one does.)
      queryClient.setQueryData<ScheduleListResponse>(['schedules'], (old) =>
        old ? { results: [created, ...old.results], count: old.count + 1 } : old,
      );
      // Alert's button onPress never fires on web (react-native-web's
      // Alert.alert is a no-op there) — don't gate navigation behind it.
      Alert.alert('Shift saved', 'The shift has been created.');
      router.back();
    },
  });

  const handleSubmit = (values: CreateShiftFormValues) => {
    const payload: CreateSchedulePayload = {
      employee_uuid: values.employeeUuid,
      start_time: toApiDateTime(values.startTime),
      end_time: toApiDateTime(values.endTime),
      break_time: toBreakTimeString(values.breakMinutes),
      ...(values.workLocationUuid ? { work_location_uuid: values.workLocationUuid } : {}),
    };
    createMutation.mutate(payload);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <CreateShiftForm
          employeeOptions={employeeOptions}
          workLocationOptions={workLocationOptions}
          isEmployeesLoading={isEmployeesLoading}
          isWorkLocationsLoading={isWorkLocationsLoading}
          isSubmitting={createMutation.isPending}
          errorMessage={getApiErrorMessage(createMutation.error, '') || undefined}
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.gutter,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    alignSelf: 'flex-start',
  },
  backLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
});
