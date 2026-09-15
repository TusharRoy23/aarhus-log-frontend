import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ActionMenu, Button } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { employeeApi } from '../../lib/api/employee';
import {
  BulkScheduleStatus,
  scheduleApi,
  type BulkScheduleItem,
  type CreateBulkSchedulePayload,
  type WorkWeek,
} from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { formatWeekLabel, parseDateOnly } from './schedule-format';
import {
  BulkScheduleWeekGrid,
  bulkCellKey,
  type BulkCellKey,
  type BulkCellValue,
  type BulkEmployeeRow,
} from './BulkScheduleWeekGrid';

interface WeekEntry {
  week: WorkWeek;
  cells: Record<BulkCellKey, BulkCellValue | undefined>;
  saveStatus: 'unsaved' | 'draft' | 'published';
}

function addDaysToDate(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function toBreakTimeString(minutesInput: string): string {
  const totalMinutes = parseInt(minutesInput, 10) || 0;
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

function combineDateAndTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours || 0, minutes || 0, 0, 0);
  return combined.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function isSameWorkWeek(a: WorkWeek, b: WorkWeek): boolean {
  return a.week_year === b.week_year && a.week_number === b.week_number;
}

// For a single card's own "change week" dropdown — any authoritative week
// not already used by another card. More permissive than the append-only
// "Add Next Week" rule below, since fixing an existing card's week isn't
// the same operation as appending a brand new one.
function selectableWorkWeeks(workWeeks: WorkWeek[], excluding: WorkWeek[]): WorkWeek[] {
  return workWeeks.filter((week) => !excluding.some((used) => isSameWorkWeek(used, week)));
}

// For "Add Next Week" — only weeks strictly after the last already-used
// week's position in the server's own (already past-week-excluded, already
// ordered) list. This is the entire mechanism keeping past/already-added
// weeks out of that list; no separate date math needed.
function addableWorkWeeks(workWeeks: WorkWeek[], usedWeeks: WorkWeek[]): WorkWeek[] {
  const usedIndices = usedWeeks
    .map((used) => workWeeks.findIndex((week) => isSameWorkWeek(week, used)))
    .filter((index) => index !== -1);
  if (usedIndices.length === 0) return workWeeks;
  return workWeeks.slice(Math.max(...usedIndices) + 1);
}

// Every filled cell in `week` becomes one bulk-schedule item. Overnight
// shifts (end time-of-day <= start time-of-day) roll the end onto the next
// calendar day — same convention used for display elsewhere in this app,
// applied here to the actual payload dates. Dates come from the week's own
// authoritative `start_date` (parsed as local midnight, not handed straight
// to `new Date()` — a bare date-only string parses as UTC otherwise).
function buildBulkScheduleItems(week: WeekEntry, employees: BulkEmployeeRow[]): BulkScheduleItem[] {
  const weekStart = parseDateOnly(week.week.start_date);
  const items: BulkScheduleItem[] = [];
  employees.forEach((employee) => {
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const cell = week.cells[bulkCellKey(employee.uuid, dayIndex)];
      if (!cell) continue;
      const startDate = addDaysToDate(weekStart, dayIndex);
      const endDate = timeToMinutes(cell.end) <= timeToMinutes(cell.start) ? addDaysToDate(startDate, 1) : startDate;
      items.push({
        employee_uuid: employee.uuid,
        start_time: combineDateAndTime(startDate, cell.start),
        end_time: combineDateAndTime(endDate, cell.end),
        break_time: cell.breakMinutes ? toBreakTimeString(cell.breakMinutes) : '',
        is_scannable: cell.isScannable,
        ...(cell.workLocationUuid ? { work_location_uuid: cell.workLocationUuid } : {}),
      });
    }
  });
  return items;
}

function countScheduledEmployees(week: WeekEntry, employees: BulkEmployeeRow[]): number {
  let count = 0;
  for (const employee of employees) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      if (week.cells[bulkCellKey(employee.uuid, dayIndex)]) {
        count += 1;
        break;
      }
    }
  }
  return count;
}

function saveStatusLabel(status: WeekEntry['saveStatus']): string {
  if (status === 'published') return 'Published';
  if (status === 'draft') return 'Draft';
  return 'Unsaved';
}

export function BulkScheduleScreen() {
  const router = useRouter();

  const { data: employeeData, isPending: isEmployeesPending, isError: isEmployeesError, error: employeesError } =
    useQuery({ queryKey: ['employees'], queryFn: employeeApi.list });
  const employees: BulkEmployeeRow[] = (employeeData?.results ?? [])
    .filter((employee) => employee.is_active)
    .map((employee) => ({
      uuid: employee.uuid,
      name: `${employee.first_name} ${employee.last_name}`,
      designation: employee.designation.name,
    }));

  // The authoritative, already-past-week-excluded list of selectable weeks
  // — the client never computes "today's week" or a week number itself for
  // this feature, it's all sourced from here.
  const {
    data: workWeekData,
    isPending: isWorkWeeksPending,
    isError: isWorkWeeksError,
    error: workWeeksError,
  } = useQuery({ queryKey: ['work-weeks'], queryFn: scheduleApi.listWorkWeeks });
  const workWeeks: WorkWeek[] = workWeekData?.results ?? [];

  const [weeks, setWeeks] = useState<WeekEntry[]>([]);
  // Seeds the first week card from the server's own list once it loads —
  // can't do this synchronously in useState's initializer since it depends
  // on an async fetch. Guarded to run exactly once (weeks.length stays >=1
  // forever after, there's no remove-week action).
  useEffect(() => {
    if (weeks.length === 0 && workWeeks.length > 0) {
      setWeeks([{ week: workWeeks[0], cells: {}, saveStatus: 'unsaved' }]);
    }
  }, [workWeeks, weeks.length]);

  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [addWeekDraft, setAddWeekDraft] = useState<WorkWeek | null>(null);

  const isLoading = isEmployeesPending || isWorkWeeksPending || weeks.length === 0;
  const loadError = isEmployeesError
    ? getApiErrorMessage(employeesError, 'Failed to load employees.')
    : isWorkWeeksError
      ? getApiErrorMessage(workWeeksError, 'Failed to load selectable weeks.')
      : undefined;

  const activeWeek = weeks[activeWeekIndex];
  const addWeekOptions = addableWorkWeeks(
    workWeeks,
    weeks.map((week) => week.week),
  );

  const updateCell = (weekIndex: number, key: BulkCellKey, value: BulkCellValue | undefined) => {
    setWeeks((prev) =>
      prev.map((week, index) => (index === weekIndex ? { ...week, cells: { ...week.cells, [key]: value } } : week)),
    );
  };

  // Changing a card's week resets its cells — they were entered against a
  // different week's actual dates, so carrying them over would silently
  // misattribute shifts to the wrong days rather than fail loudly.
  const changeCardWeek = (weekIndex: number, newWeek: WorkWeek) => {
    setWeeks((prev) =>
      prev.map((week, index) => (index === weekIndex ? { week: newWeek, cells: {}, saveStatus: 'unsaved' } : week)),
    );
  };

  const handleAddWeek = () => {
    if (!addWeekDraft) return;
    setActiveWeekIndex(weeks.length);
    setWeeks((prev) => [...prev, { week: addWeekDraft, cells: {}, saveStatus: 'unsaved' }]);
    setAddWeekDraft(null);
  };

  const bulkSaveMutation = useMutation({
    mutationFn: (payload: CreateBulkSchedulePayload) => scheduleApi.bulkCreate(payload),
  });

  const handleSave = (status: BulkScheduleStatus) => {
    const items = buildBulkScheduleItems(activeWeek, employees);
    if (items.length === 0) {
      Alert.alert('Nothing to save', 'Add at least one shift before saving.');
      return;
    }
    bulkSaveMutation.mutate(
      { week: activeWeek.week.week_number, schedules: items, status },
      {
        onSuccess: () => {
          setWeeks((prev) =>
            prev.map((week, index) => (index === activeWeekIndex ? { ...week, saveStatus: status } : week)),
          );
          Alert.alert(
            status === 'draft' ? 'Draft saved' : 'Schedule published',
            status === 'draft' ? "This week's roster has been saved as a draft." : 'This week has been published.',
          );
        },
        onError: (error) => {
          Alert.alert('Failed to save', getApiErrorMessage(error, 'Something went wrong. Please try again.'));
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Bulk Schedule</Text>
          <Text style={styles.headerSubtitle}>Add weekly rosters</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : loadError ? (
          <Text style={styles.errorText}>{loadError}</Text>
        ) : (
          <>
            {weeks.map((week, index) =>
              index === activeWeekIndex ? (
                <BulkScheduleWeekGrid
                  key={`${week.week.week_year}-${week.week.week_number}`}
                  employees={employees}
                  week={week.week}
                  cells={week.cells}
                  onCellChange={(key, value) => updateCell(index, key, value)}
                  weekOptions={selectableWorkWeeks(
                    workWeeks,
                    weeks.filter((_, i) => i !== index).map((w) => w.week),
                  )}
                  onSelectWeek={(newWeek) => changeCardWeek(index, newWeek)}
                />
              ) : (
                <Pressable
                  key={`${week.week.week_year}-${week.week.week_number}`}
                  style={styles.collapsedRow}
                  onPress={() => setActiveWeekIndex(index)}
                >
                  <Text style={styles.collapsedLabel}>{formatWeekLabel(week.week)}</Text>
                  <View style={styles.collapsedMeta}>
                    <Text style={styles.collapsedStatus}>{saveStatusLabel(week.saveStatus)}</Text>
                    <MaterialIcons name="chevron-right" size={20} color={Colors.onSurfaceVariant} />
                  </View>
                </Pressable>
              ),
            )}

            <View style={styles.addWeekCard}>
              <View style={styles.addWeekHeaderRow}>
                <MaterialIcons name="add-circle-outline" size={20} color={Colors.primary} />
                <Text style={styles.addWeekHeaderTitle}>ADD NEXT WEEK</Text>
              </View>
              <Text style={styles.addWeekHint}>
                Week {activeWeek.week.week_number} excluded from future list
              </Text>

              <ActionMenu
                trigger={
                  <View style={styles.weekTrigger}>
                    <Text style={addWeekDraft ? styles.weekTriggerText : styles.weekTriggerPlaceholder}>
                      {addWeekDraft ? formatWeekLabel(addWeekDraft) : 'Select future week (e.g. Week 39, Week 40...)'}
                    </Text>
                    <MaterialIcons name="expand-more" size={20} color={Colors.onSurfaceVariant} />
                  </View>
                }
                items={addWeekOptions.map((option) => ({
                  label: formatWeekLabel(option),
                  icon: 'calendar-today' as const,
                  onPress: () => setAddWeekDraft(option),
                }))}
              />

              <View style={styles.addWeekFooterRow}>
                <Text style={styles.addWeekHelperText}>
                  Only future weeks (≥ Week {addWeekOptions[0]?.week_number}) selectable
                </Text>
                <Button label="+ Add Week" onPress={handleAddWeek} disabled={!addWeekDraft} />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {!isLoading && !loadError ? (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarStatusRow}>
            <View style={styles.bottomBarDot} />
            <View>
              <Text style={styles.bottomBarTitle}>
                Week {activeWeek.week.week_number} {saveStatusLabel(activeWeek.saveStatus)}
              </Text>
              <Text style={styles.bottomBarSubtitle}>
                {countScheduledEmployees(activeWeek, employees)} staff rostered
              </Text>
            </View>
          </View>
          <View style={styles.bottomBarActions}>
            <Button
              label="Save Draft"
              variant="secondary"
              onPress={() => handleSave(BulkScheduleStatus.DRAFT)}
              loading={bulkSaveMutation.isPending}
              style={styles.bottomBarButton}
            />
            <Button
              label={`Publish (W${activeWeek.week.week_number})`}
              onPress={() => handleSave(BulkScheduleStatus.PUBLISHED)}
              loading={bulkSaveMutation.isPending}
              style={styles.bottomBarButton}
            />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
    padding: Spacing.containerPaddingMobile,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  headerText: {
    gap: 2,
  },
  headerTitle: {
    ...Typography.headlineLgMobile,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.onSurface,
  },
  headerSubtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  scrollContent: {
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.gutter,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: Spacing.sectionGap * 2,
  },
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  collapsedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
  },
  collapsedLabel: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  collapsedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit,
  },
  collapsedStatus: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  addWeekCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.outline,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 3,
  },
  addWeekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  addWeekHeaderTitle: {
    ...Typography.labelSm,
    color: Colors.onSurface,
  },
  addWeekHint: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  weekTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 3,
  },
  weekTriggerText: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  weekTriggerPlaceholder: {
    ...Typography.bodyMd,
    color: Colors.outline,
  },
  addWeekFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.unit * 2,
  },
  addWeekHelperText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    flexShrink: 1,
  },
  bottomBar: {
    gap: Spacing.gutter,
    padding: Spacing.containerPaddingMobile,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  bottomBarStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  bottomBarDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  bottomBarTitle: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  bottomBarSubtitle: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  bottomBarActions: {
    flexDirection: 'row',
    gap: Spacing.unit * 3,
  },
  bottomBarButton: {
    flex: 1,
  },
});
