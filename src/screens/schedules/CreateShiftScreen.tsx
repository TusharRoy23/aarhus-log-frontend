import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { employeeApi } from '../../lib/api/employee';
import { scheduleApi, type CreateSchedulePayload } from '../../lib/api/schedule';
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

// Inverse of toApiDateTime — API datetimes come back with seconds + an
// offset (e.g. '2026-08-02T12:45:00+02:00'); DateTimeField wants local
// 'YYYY-MM-DDTHH:MM' with no seconds/offset. `new Date(iso)` already
// resolves the offset for us, so reading the local getters back off it
// gives the right wall-clock value to display.
function fromApiDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromBreakTimeString(breakTime: string): string {
  const [hours, minutes] = breakTime.split(':').map(Number);
  return String((hours || 0) * 60 + (minutes || 0));
}

export function CreateShiftScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { uuid } = useLocalSearchParams<{ uuid?: string }>();
  const isEditing = Boolean(uuid);

  // Schedules are cached under several different keys depending on which
  // filters were active elsewhere (['schedules', scheduleType],
  // ['schedules', from, to]) — there's no single list to read the record
  // being edited out of, so fetch it directly by uuid instead.
  const { data: existingSchedule, isPending: isExistingScheduleLoading } = useQuery({
    queryKey: ['schedule', uuid],
    queryFn: () => scheduleApi.get(uuid!),
    enabled: isEditing,
  });

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

  const saveMutation = useMutation({
    mutationFn: (payload: CreateSchedulePayload) =>
      isEditing ? scheduleApi.update(uuid!, payload) : scheduleApi.create(payload),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      if (isEditing) {
        queryClient.setQueryData(['schedule', uuid], saved);
      }
      Alert.alert(isEditing ? 'Schedule updated' : 'Schedule saved', isEditing ? 'The schedule has been updated.' : 'The schedule has been created.');
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
    saveMutation.mutate(payload);
  };

  const initialValues: CreateShiftFormValues | undefined = existingSchedule
    ? {
      startTime: fromApiDateTime(existingSchedule.start_time),
      endTime: fromApiDateTime(existingSchedule.end_time),
      employeeUuid: existingSchedule.employee.uuid,
      workLocationUuid: existingSchedule.work_location?.uuid ?? '',
      breakMinutes: fromBreakTimeString(existingSchedule.break_time),
    }
    : undefined;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        {isEditing && isExistingScheduleLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : (
          <CreateShiftForm
            employeeOptions={employeeOptions}
            workLocationOptions={workLocationOptions}
            isEmployeesLoading={isEmployeesLoading}
            isWorkLocationsLoading={isWorkLocationsLoading}
            isSubmitting={saveMutation.isPending}
            errorMessage={getApiErrorMessage(saveMutation.error, '') || undefined}
            initialValues={initialValues}
            onSubmit={handleSubmit}
          />
        )}
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
  loading: {
    marginTop: Spacing.sectionGap,
  },
});
