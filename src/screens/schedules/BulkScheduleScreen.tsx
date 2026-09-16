import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  type BulkSchedule,
  type BulkScheduleItem,
  type CreateBulkSchedulePayload,
  type Schedule,
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDaysToDate(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Monday of the week containing `date` — plain calendar-day arithmetic, not
// ISO week *numbering* (that stays server-owned everywhere else in this
// feature). Only needed here as a fallback for editing a bulk schedule
// whose week has already fallen out of the server's "selectable weeks" list
// (a past week) — see resolveEditWorkWeek below.
function mondayOf(date: Date): Date {
  const start = startOfDay(date);
  const dayOffset = (start.getDay() + 6) % 7;
  return addDaysToDate(start, -dayOffset);
}

function toDateOnlyString(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function formatTimeHHMM(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function toBreakTimeString(minutesInput: string): string {
  const totalMinutes = parseInt(minutesInput, 10) || 0;
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

// Inverse of toBreakTimeString — '01:30:00' -> '90'.
function breakTimeStringToMinutes(breakTime: string): string {
  const [hours, minutes] = breakTime.split(':').map(Number);
  const total = (hours || 0) * 60 + (minutes || 0);
  return total > 0 ? String(total) : '';
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

// Prefer the server's own selectable-weeks list (keeps start_date/end_date
// authoritative); fall back to deriving the week's Monday from the earliest
// existing shift's date when editing a week that's already fallen out of
// that list (a past week) — plain calendar math, not a re-derived week
// *number* (that always comes straight from the bulk schedule itself).
function resolveEditWorkWeek(bulkSchedule: BulkSchedule, workWeeks: WorkWeek[]): WorkWeek | undefined {
  const fromServerList = workWeeks.find(
    (week) => week.week_number === bulkSchedule.week_number && week.week_year === bulkSchedule.week_year,
  );
  if (fromServerList) return fromServerList;
  const firstSchedule = bulkSchedule.schedules[0];
  if (!firstSchedule) return undefined;
  const weekStart = mondayOf(new Date(firstSchedule.start_time));
  return {
    week_number: bulkSchedule.week_number,
    week_year: bulkSchedule.week_year,
    start_date: toDateOnlyString(weekStart),
    end_date: toDateOnlyString(addDaysToDate(weekStart, 6)),
  };
}

// Converts an existing bulk schedule's flat Schedule[] back into the cell
// map the grid edits. Employees no longer active won't have a row to show
// this in, so a shift for a deactivated employee is silently dropped on
// next save — same "auto-populate active employees only" boundary already
// accepted for create, not a new gap introduced by editing.
function buildCellsFromSchedules(
  schedules: Schedule[],
  weekStart: Date,
): Record<BulkCellKey, BulkCellValue | undefined> {
  const cells: Record<BulkCellKey, BulkCellValue | undefined> = {};
  for (const schedule of schedules) {
    const dayIndex = Math.round((startOfDay(new Date(schedule.start_time)).getTime() - weekStart.getTime()) / MS_PER_DAY);
    if (dayIndex < 0 || dayIndex > 6) continue;
    cells[bulkCellKey(schedule.employee.uuid, dayIndex)] = {
      start: formatTimeHHMM(new Date(schedule.start_time)),
      end: formatTimeHHMM(new Date(schedule.end_time)),
      breakMinutes: breakTimeStringToMinutes(schedule.break_time),
      isScannable: schedule.start_method === 'qr',
      ...(schedule.work_location ? { workLocationUuid: schedule.work_location.uuid } : {}),
    };
  }
  return cells;
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
  if (status === BulkScheduleStatus.PUBLISHED) return 'Published';
  if (status === BulkScheduleStatus.DRAFT) return 'Draft';
  return 'Unsaved';
}

export function BulkScheduleScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { uuid } = useLocalSearchParams<{ uuid?: string }>();
  const isEditing = Boolean(uuid);

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
  // this feature, it's all sourced from here. Still fetched when editing:
  // it's the primary lookup for resolving the week being edited (see
  // resolveEditWorkWeek).
  const {
    data: workWeekData,
    isPending: isWorkWeeksPending,
    isError: isWorkWeeksError,
    error: workWeeksError,
  } = useQuery({ queryKey: ['work-weeks'], queryFn: scheduleApi.listWorkWeeks });
  const workWeeks: WorkWeek[] = workWeekData?.results ?? [];

  // Bulk schedules are cached under one shared key regardless of which
  // screen fetched them — a user reaching this screen from the Bulk
  // Schedules tab almost always hits an already-warm cache here.
  const {
    data: bulkListData,
    isPending: isBulkListPending,
    isError: isBulkListError,
    error: bulkListError,
  } = useQuery({ queryKey: ['bulk-schedules'], queryFn: scheduleApi.bulkList, enabled: isEditing });
  const existingBulkSchedule = bulkListData?.results.find((bulkSchedule) => bulkSchedule.uuid === uuid);

  const [weeks, setWeeks] = useState<WeekEntry[]>([]);
  // Seeds the single week card once its data is ready — can't do this
  // synchronously in useState's initializer since it depends on async
  // fetches either way. Guarded to run exactly once (weeks.length stays
  // >=1 forever after — there's no remove-week action, and editing only
  // ever has the one week).
  useEffect(() => {
    if (weeks.length > 0) return;
    if (isEditing) {
      if (!existingBulkSchedule) return;
      const resolvedWeek = resolveEditWorkWeek(existingBulkSchedule, workWeeks);
      if (!resolvedWeek) return;
      const cells = buildCellsFromSchedules(existingBulkSchedule.schedules, parseDateOnly(resolvedWeek.start_date));
      setWeeks([
        {
          week: resolvedWeek,
          cells,
          saveStatus: existingBulkSchedule.status === BulkScheduleStatus.PUBLISHED ? 'published' : 'draft',
        },
      ]);
    } else if (workWeeks.length > 0) {
      setWeeks([{ week: workWeeks[0], cells: {}, saveStatus: 'unsaved' }]);
    }
  }, [isEditing, existingBulkSchedule, workWeeks, weeks.length]);

  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [addWeekDraft, setAddWeekDraft] = useState<WorkWeek | null>(null);

  const isLoading =
    isEmployeesPending ||
    isWorkWeeksPending ||
    (isEditing && isBulkListPending) ||
    weeks.length === 0;
  const loadError = isEmployeesError
    ? getApiErrorMessage(employeesError, 'Failed to load employees.')
    : isWorkWeeksError
      ? getApiErrorMessage(workWeeksError, 'Failed to load selectable weeks.')
      : isEditing && isBulkListError
        ? getApiErrorMessage(bulkListError, 'Failed to load this bulk schedule.')
        : isEditing && !isBulkListPending && !existingBulkSchedule
          ? 'This bulk schedule could not be found.'
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
  // misattribute shifts to the wrong days rather than fail loudly. Not
  // reachable at all in edit mode (the grid's change-week control is
  // hidden there), but kept generic rather than special-cased.
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
    mutationFn: (payload: CreateBulkSchedulePayload) =>
      isEditing && uuid ? scheduleApi.updateWeeklyShifts(payload, uuid) : scheduleApi.bulkCreate(payload),
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
          // Bulk Schedules list reads from this same key — refetch it so an
          // edit (or a brand new roster) shows up there without a manual pull.
          queryClient.invalidateQueries({ queryKey: ['bulk-schedules'] });
          Alert.alert(
            status === BulkScheduleStatus.DRAFT ? 'Draft saved' : 'Schedule published',
            status === BulkScheduleStatus.DRAFT ? "This week's roster has been saved as a draft." : 'This week has been published.',
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
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Bulk Schedule' : 'Bulk Schedule'}</Text>
          <Text style={styles.headerSubtitle}>
            {isEditing ? "Update this week's roster" : 'Add weekly rosters'}
          </Text>
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
                  weekOptions={
                    isEditing
                      ? undefined
                      : selectableWorkWeeks(
                        workWeeks,
                        weeks.filter((_, i) => i !== index).map((w) => w.week),
                      )
                  }
                  onSelectWeek={isEditing ? undefined : (newWeek) => changeCardWeek(index, newWeek)}
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

            {/* Adding more weeks doesn't make sense while editing one
                specific existing week — hidden entirely in that mode. */}
            {!isEditing ? (
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
                        {addWeekDraft
                          ? formatWeekLabel(addWeekDraft)
                          : 'Select future week (e.g. Week 39, Week 40...)'}
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
            ) : null}
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
