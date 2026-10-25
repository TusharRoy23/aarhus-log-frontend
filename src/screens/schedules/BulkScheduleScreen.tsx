import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  type CreateSchedulePayload,
  type EmployeeRuleViolations,
  type Schedule,
  type DailyCost,
  type ShiftPlanPayload,
  type WorkWeek,
} from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { formatWeekLabel, parseDateOnly, resolveBulkScheduleWeek } from './schedule-format';
import {
  BulkScheduleWeekGrid,
  groupEntriesByTime,
  toDateOnlyString,
  type BulkEmployeeRow,
  type BulkShiftEntry,
} from './BulkScheduleWeekGrid';

interface WeekEntry {
  week: WorkWeek;
  entries: BulkShiftEntry[];
  saveStatus: 'unsaved' | 'draft' | 'published';
  dailyCosts: DailyCost[];
  /** The underlying BulkSchedule's own uuid, needed to publish — null until
   * the first shift has actually been saved as a draft. */
  bulkScheduleUuid: string | null;
  /** null = never fetched yet; [] = fetched, no violations. */
  ruleViolations: EmployeeRuleViolations[];
  violationsLoading: boolean;
  /** Non-collapsed by default. */
  violationsCollapsed: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDaysToDate(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
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

// Converts an existing bulk schedule's flat Schedule[] back into the entry
// list the grid edits. Employees no longer active won't appear in the
// employee picker, but their existing entries still render (looked up by
// uuid, falling back to "Unknown employee" if not found) — resaving one of
// those as-is (without changing its employee) still sends that now-inactive
// employee's uuid, since saving is now per-shift with no whole-week active-
// employee filter. Exported for reuse by BulkScheduleViewScreen's own
// (read-only) entry population.
export function buildEntriesFromSchedules(schedules: Schedule[], weekStart: Date): BulkShiftEntry[] {
  if (!schedules || schedules.length === 0) return [];
  const entries: BulkShiftEntry[] = [];
  for (const schedule of schedules) {
    const dayIndex = Math.round((startOfDay(new Date(schedule.start_time)).getTime() - weekStart.getTime()) / MS_PER_DAY);
    if (dayIndex < 0 || dayIndex > 6) continue;
    entries.push({
      id: schedule.uuid,
      // null means an open shift — no employee assigned yet.
      employeeUuid: schedule.employee?.uuid ?? '',
      dayIndex,
      start: formatTimeHHMM(new Date(schedule.start_time)),
      end: formatTimeHHMM(new Date(schedule.end_time)),
      breakMinutes: breakTimeStringToMinutes(schedule.break_time),
      isScannable: schedule.start_method === 'qr',
      ...(schedule.work_location ? { workLocationUuid: schedule.work_location.uuid } : {}),
    });
  }
  return entries;
}

// The rejected API body is the raw response data, so collect every string in
// it (including arrays of strings, e.g. per-field validation messages) rather
// than assuming one field name for the error text.
function errorLines(error: unknown, fallback: string): string[] {
  const lines = new Set<string>();
  const collect = (value: unknown) => {
    if (typeof value === 'string') lines.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(error);
  return lines.size > 0 ? [...lines] : [fallback];
}

function changedDayIndexes(before: BulkShiftEntry[], after: BulkShiftEntry[]): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter(
    (dayIndex) =>
      JSON.stringify(before.filter((entry) => entry.dayIndex === dayIndex)) !==
      JSON.stringify(after.filter((entry) => entry.dayIndex === dayIndex)),
  );
}

function shiftPlanForGroup(group: { start: string; end: string; entries: BulkShiftEntry[] }): ShiftPlanPayload {
  return {
    start_time: group.start,
    end_time: group.end,
    employees: group.entries.map((entry) => entry.employeeUuid),
  };
}

async function fetchWeeklyCosts(weekNumber: number): Promise<DailyCost[]> {
  try {
    const response = await scheduleApi.getWeeklyCosts(weekNumber);
    return response.days;
  } catch {
    return [];
  }
}

// Picking a week — either the active card's own change-week dropdown, or
// the "Add Next Week" flow — checks the backend for an already-existing
// bulk schedule on that week and loads it if found, rather than always
// starting blank. This keeps picking an already-scheduled week from
// silently building a second, conflicting roster under the same week
// number: it becomes an edit of the existing one instead. Saved weeks also
// load their per-day costs; a blank week has none to show yet.
async function fetchWeekEntry(week: WorkWeek): Promise<WeekEntry> {
  try {
    const existing = await scheduleApi.getBulkSchedule(week.week_number);
    return {
      week,
      entries: buildEntriesFromSchedules(existing.schedules, parseDateOnly(week.start_date)),
      saveStatus: existing.status === BulkScheduleStatus.PUBLISHED ? 'published' : 'draft',
      dailyCosts: await fetchWeeklyCosts(week.week_number),
      bulkScheduleUuid: existing.uuid,
      ruleViolations: [],
      violationsLoading: false,
      violationsCollapsed: false,
    };
  } catch {
    return {
      week,
      entries: [],
      saveStatus: 'unsaved',
      dailyCosts: [],
      bulkScheduleUuid: null,
      ruleViolations: [],
      violationsLoading: false,
      violationsCollapsed: false,
    };
  }
}

// One entry becomes one single-shift payload for createDraftSchedule/
// updateDraftSchedule — each shift is now saved on its own as soon as the
// admin saves it in the editor,
// not batched into one whole-week request. Overnight shifts (end time-of-day
// <= start time-of-day) roll the end onto the next calendar day — same
// convention used for display elsewhere in this app, applied here to the
// actual payload dates. Dates come from the week's own authoritative
// `start_date` (parsed as local midnight, not handed straight to `new
// Date()` — a bare date-only string parses as UTC otherwise).
function buildSchedulePayload(entry: BulkShiftEntry, weekStart: Date): CreateSchedulePayload {
  const startDate = addDaysToDate(weekStart, entry.dayIndex);
  const endDate = timeToMinutes(entry.end) <= timeToMinutes(entry.start) ? addDaysToDate(startDate, 1) : startDate;
  return {
    // Omitted (not sent as '') when unassigned — the backend treats a
    // shift with no employee_uuid as an open shift any employee can pick
    // up later.
    ...(entry.employeeUuid ? { employee_uuid: entry.employeeUuid } : {}),
    start_time: combineDateAndTime(startDate, entry.start),
    end_time: combineDateAndTime(endDate, entry.end),
    break_time: entry.breakMinutes ? toBreakTimeString(entry.breakMinutes) : '',
    is_scannable: entry.isScannable,
    ...(entry.workLocationUuid ? { work_location_uuid: entry.workLocationUuid } : {}),
  };
}

// Exactly one entry is added or edited per shift-editor Save (the grid never
// changes more than one at once) — this picks that entry out by diffing
// against the previous entries by id. A pure removal yields nothing here,
// since there's no bulk-schedule delete endpoint yet (see updateEntries).
function changedEntries(before: BulkShiftEntry[], after: BulkShiftEntry[]): BulkShiftEntry[] {
  const beforeById = new Map(before.map((entry) => [entry.id, entry]));
  return after.filter((entry) => {
    const previous = beforeById.get(entry.id);
    return !previous || JSON.stringify(previous) !== JSON.stringify(entry);
  });
}

// Entries present in `before` but gone from `after` — removed via the
// grid's "Remove" button.
function removedEntries(before: BulkShiftEntry[], after: BulkShiftEntry[]): BulkShiftEntry[] {
  const afterIds = new Set(after.map((entry) => entry.id));
  return before.filter((entry) => !afterIds.has(entry.id));
}

// createEntryId (BulkScheduleWeekGrid.tsx) prefixes every client-generated
// id with 'entry-' — such an entry was never confirmed saved (its own
// createDraftSchedule call hasn't resolved, or failed), so there's nothing
// on the server to delete yet, and a further edit before that still routes
// to createDraftSchedule, not update. Any other id is a real schedule uuid,
// either loaded from the server or reconciled in after a previous
// successful save.
function isClientOnlyEntryId(id: string): boolean {
  return id.startsWith('entry-');
}

function countScheduledEmployees(week: WeekEntry, employees: BulkEmployeeRow[]): number {
  const activeEmployeeUuids = new Set(employees.map((employee) => employee.uuid));
  const scheduled = new Set(
    week.entries.filter((entry) => activeEmployeeUuids.has(entry.employeeUuid)).map((entry) => entry.employeeUuid),
  );
  return scheduled.size;
}

function saveStatusLabel(status: WeekEntry['saveStatus']): string {
  if (status === BulkScheduleStatus.PUBLISHED) return 'Published';
  if (status === BulkScheduleStatus.DRAFT) return 'Draft';
  return 'Unsaved';
}

export function BulkScheduleScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { week_number: weekNumberParam } = useLocalSearchParams<{ week_number?: string }>();
  const isEditing = Boolean(weekNumberParam);

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
  const existingBulkSchedule = bulkListData?.results.find(
    (bulkSchedule) => bulkSchedule.week_number === Number(weekNumberParam),
  );

  const [weeks, setWeeks] = useState<WeekEntry[]>([]);
  // Guards the create-mode branch below against firing fetchWeekEntry more
  // than once while its promise is still in flight (the effect can re-run
  // on every dependency change before that resolves) — weeks.length only
  // flips from 0 once the fetch actually finishes and calls setWeeks.
  const isSeedingRef = useRef(false);
  // Seeds the single week card once its data is ready — can't do this
  // synchronously in useState's initializer since it depends on async
  // fetches either way. Guarded to run exactly once (weeks.length stays
  // >=1 forever after — there's no remove-week action, and editing only
  // ever has the one week).
  useEffect(() => {
    if (weeks.length > 0 || isSeedingRef.current) return;
    if (isEditing) {
      if (!existingBulkSchedule) return;
      const resolvedWeek = resolveBulkScheduleWeek(existingBulkSchedule, workWeeks);
      if (!resolvedWeek) return;
      const entries = buildEntriesFromSchedules(existingBulkSchedule.schedules, parseDateOnly(resolvedWeek.start_date));
      isSeedingRef.current = true;
      fetchWeeklyCosts(existingBulkSchedule.week_number).then((dailyCosts) => {
        setWeeks([
          {
            week: resolvedWeek,
            entries,
            saveStatus: existingBulkSchedule.status === BulkScheduleStatus.PUBLISHED ? 'published' : 'draft',
            dailyCosts,
            bulkScheduleUuid: existingBulkSchedule.uuid,
            ruleViolations: [],
            violationsLoading: false,
            violationsCollapsed: false,
          },
        ]);
        isSeedingRef.current = false;
        fetchViolations(0, existingBulkSchedule.uuid);
      });
    } else if (workWeeks.length > 0) {
      isSeedingRef.current = true;
      fetchWeekEntry(workWeeks[0]).then((entry) => {
        setWeeks([entry]);
        isSeedingRef.current = false;
        if (entry.bulkScheduleUuid) fetchViolations(0, entry.bulkScheduleUuid);
      });
    }
  }, [isEditing, existingBulkSchedule, workWeeks, weeks.length]);

  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [errorModal, setErrorModal] = useState<{ title: string; lines: string[] } | undefined>();
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
        ? getApiErrorMessage(bulkListError, 'Failed to load this schedule.')
        : isEditing && !isBulkListPending && !existingBulkSchedule
          ? 'This schedule could not be found.'
          : undefined;

  const activeWeek = weeks[activeWeekIndex];
  const addWeekOptions = addableWorkWeeks(
    workWeeks,
    weeks.map((week) => week.week),
  );

  const setDayCost = (weekIndex: number, date: string, total: number | undefined) => {
    setWeeks((prev) =>
      prev.map((week, index) => {
        if (index !== weekIndex) return week;
        const others = week.dailyCosts.filter((cost) => cost.date !== date);
        return { ...week, dailyCosts: total === undefined ? others : [...others, { date, estimated_pay: total }] };
      }),
    );
  };

  // createDraftSchedule, updateDraftSchedule, and deleteDraftSchedule all
  // return the bulk schedule's current state — reconciling local entries
  // from that response (rather than patching just the one entry that
  // changed) is what lets newly-saved entries pick up their real
  // server-assigned uuid.
  const applyBulkScheduleResult = (weekIndex: number, weekStart: Date, bulkSchedule: BulkSchedule) => {
    setWeeks((prev) =>
      prev.map((card, index) =>
        index === weekIndex
          ? {
            ...card,
            entries: buildEntriesFromSchedules(bulkSchedule.schedules, weekStart),
            bulkScheduleUuid: bulkSchedule.uuid,
            saveStatus: bulkSchedule.status === BulkScheduleStatus.PUBLISHED ? 'published' : 'draft',
          }
          : card,
      ),
    );
    queryClient.invalidateQueries({ queryKey: ['bulk-schedules'] });
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    // Re-checks rule violations after every add/update/delete — the only
    // other trigger is the violations section's own manual reload icon.
    fetchViolations(weekIndex, bulkSchedule.uuid);
  };

  const fetchViolations = (weekIndex: number, bulkScheduleUuid: string) => {
    setWeeks((prev) => prev.map((card, index) => (index === weekIndex ? { ...card, violationsLoading: true } : card)));
    scheduleApi
      .getViolatedRules(bulkScheduleUuid)
      .then((violations) => {
        setWeeks((prev) =>
          prev.map((card, index) => (index === weekIndex ? {
            ...card,
            ruleViolations: violations.results,
            violationsLoading: false
          } : card)),
        );
      })
      .catch((error) => {
        setWeeks((prev) => prev.map((card, index) => (index === weekIndex ? { ...card, violationsLoading: false } : card)));
        setErrorModal({
          title: 'Could not load rule violations',
          lines: errorLines(error, 'Something went wrong. Please try again.'),
        });
      });
  };

  const toggleViolationsCollapsed = (weekIndex: number) => {
    setWeeks((prev) =>
      prev.map((card, index) => (index === weekIndex ? { ...card, violationsCollapsed: !card.violationsCollapsed } : card)),
    );
  };

  // Every create/update prices each changed day from its own shifts via the
  // estimate endpoint — saved costs are only read back when a saved week is
  // opened.
  const updateEntries = (weekIndex: number, nextEntries: BulkShiftEntry[]) => {
    const { week, entries: previousEntries, bulkScheduleUuid } = weeks[weekIndex];
    setWeeks((prev) => prev.map((card, index) => (index === weekIndex ? { ...card, entries: nextEntries } : card)));
    const weekStart = parseDateOnly(week.start_date);
    for (const dayIndex of changedDayIndexes(previousEntries, nextEntries)) {
      const day = addDaysToDate(weekStart, dayIndex);
      const date = toDateOnlyString(day);
      const dayEntries = nextEntries.filter((entry) => entry.dayIndex === dayIndex && entry.employeeUuid);
      if (dayEntries.length === 0) {
        setDayCost(weekIndex, date, undefined);
        continue;
      }
      const shift = groupEntriesByTime(dayEntries).map(shiftPlanForGroup);
      scheduleApi
        .estimateDailyCosts({ date, shift })
        .then((estimate) => setDayCost(weekIndex, date, estimate.total_estimated_pay))
        .catch((error) => {
          setErrorModal({
            title: 'Cost estimate failed',
            lines: errorLines(error, 'Could not estimate the cost for this day.'),
          });
          setDayCost(weekIndex, date, undefined);
        });
    }

    // Each added/edited shift is saved on its own right away — there's no
    // separate "Save Draft" step anymore. A changed entry still carrying its
    // client-generated id (see isClientOnlyEntryId) was never saved, so it's
    // a brand new shift (createDraftSchedule); any other id is a real
    // schedule uuid being edited (updateDraftSchedule).
    for (const entry of changedEntries(previousEntries, nextEntries)) {
      const payload = buildSchedulePayload(entry, weekStart);
      const request =
        isClientOnlyEntryId(entry.id) || !bulkScheduleUuid
          ? scheduleApi.createDraftSchedule(payload, week.week_number)
          : scheduleApi.updateDraftSchedule(payload, bulkScheduleUuid, entry.id);
      request
        .then((bulkSchedule) => applyBulkScheduleResult(weekIndex, weekStart, bulkSchedule))
        .catch((error) => {
          setErrorModal({ title: 'Could not save shift', lines: errorLines(error, 'Something went wrong. Please try again.') });
        });
    }

    // A removed entry that was never actually saved (still carrying its
    // client-generated id — see createEntryId in BulkScheduleWeekGrid) has
    // nothing on the server to delete, so it's dropped locally with no API
    // call. An already-saved entry (a real schedule uuid) calls
    // deleteDraftSchedule to remove it from the bulk schedule for real.
    for (const entry of removedEntries(previousEntries, nextEntries)) {
      if (isClientOnlyEntryId(entry.id) || !bulkScheduleUuid) continue;
      scheduleApi
        .deleteDraftSchedule(bulkScheduleUuid, entry.id)
        .then((bulkSchedule) => applyBulkScheduleResult(weekIndex, weekStart, bulkSchedule))
        .catch((error) => {
          setErrorModal({ title: 'Could not remove shift', lines: errorLines(error, 'Something went wrong. Please try again.') });
        });
    }
  };

  const [isResolvingWeek, setIsResolvingWeek] = useState(false);

  // Changing a card's week discards its current cells — they were entered
  // against a different week's actual dates, so carrying them over would
  // silently misattribute shifts to the wrong days rather than fail loudly.
  // The new week's own cells come from fetchWeekEntry (blank, unless that
  // week already has a bulk schedule on the backend). Not reachable at all
  // in edit mode (the grid's change-week control is hidden there).
  const changeCardWeek = async (weekIndex: number, newWeek: WorkWeek) => {
    setIsResolvingWeek(true);
    const entry = await fetchWeekEntry(newWeek);
    setWeeks((prev) => prev.map((week, index) => (index === weekIndex ? entry : week)));
    setIsResolvingWeek(false);
    if (entry.bulkScheduleUuid) fetchViolations(weekIndex, entry.bulkScheduleUuid);
  };

  const handleAddWeek = async () => {
    if (!addWeekDraft) return;
    const draft = addWeekDraft;
    const newIndex = weeks.length;
    setAddWeekDraft(null);
    setIsResolvingWeek(true);
    const entry = await fetchWeekEntry(draft);
    setWeeks((prev) => [...prev, entry]);
    setActiveWeekIndex(newIndex);
    setIsResolvingWeek(false);
    if (entry.bulkScheduleUuid) fetchViolations(newIndex, entry.bulkScheduleUuid);
  };

  // Publishing now only needs the bulk schedule's own uuid — each shift was
  // already saved as a draft individually as it was added/edited, so there's
  // no payload left to build here.
  const publishMutation = useMutation({
    mutationFn: (bulkScheduleUuid: string) => scheduleApi.publishDraftSchedule(bulkScheduleUuid),
  });

  const handlePublish = () => {
    const bulkScheduleUuid = activeWeek.bulkScheduleUuid;
    if (!bulkScheduleUuid) return; // guarded by the Publish button's own disabled state too
    const weekIndex = activeWeekIndex;
    const weekStart = parseDateOnly(activeWeek.week.start_date);
    publishMutation.mutate(bulkScheduleUuid, {
      onSuccess: (bulkSchedule) => {
        setWeeks((prev) =>
          prev.map((week, index) =>
            index === weekIndex
              ? {
                ...week,
                saveStatus: 'published',
                entries: buildEntriesFromSchedules(bulkSchedule.schedules, weekStart),
              }
              : week,
          ),
        );
        queryClient.invalidateQueries({ queryKey: ['bulk-schedules'] });
        queryClient.invalidateQueries({ queryKey: ['schedules'] });
        Alert.alert('Schedule published', 'This week has been published.');
      },
      onError: (error) => {
        setErrorModal({ title: 'Failed to publish', lines: errorLines(error, 'Something went wrong. Please try again.') });
      },
    });
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Schedule' : 'Schedule'}</Text>
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
                <View key={`${week.week.week_year}-${week.week.week_number}`} style={styles.activeWeekWrapper}>
                  <BulkScheduleWeekGrid
                    employees={employees}
                    week={week.week}
                    entries={week.entries}
                    onEntriesChange={(nextEntries) => updateEntries(index, nextEntries)}
                    weekOptions={
                      isEditing
                        ? undefined
                        : selectableWorkWeeks(
                          workWeeks,
                          weeks.filter((_, i) => i !== index).map((w) => w.week),
                        )
                    }
                    onSelectWeek={isEditing ? undefined : (newWeek) => changeCardWeek(index, newWeek)}
                    dailyCosts={week.dailyCosts}
                    onEditorOpen={() => week.bulkScheduleUuid && fetchViolations(index, week.bulkScheduleUuid)}
                  />

                  <View style={styles.violationsCard}>
                    <View style={styles.violationsHeader}>
                      <Pressable style={styles.violationsHeaderLeft} onPress={() => toggleViolationsCollapsed(index)}>
                        <MaterialIcons
                          name={week.violationsCollapsed ? 'expand-more' : 'expand-less'}
                          size={20}
                          color={Colors.onSurface}
                        />
                        <Text style={styles.violationsTitle}>Rule Violations</Text>
                        {(() => {
                          const count = (week.ruleViolations ?? []).reduce((sum, e) => sum + e.violations.length, 0);
                          return count > 0 ? (
                            <View style={styles.violationsBadge}>
                              <Text style={styles.violationsBadgeText}>{count}</Text>
                            </View>
                          ) : null;
                        })()}
                      </Pressable>
                      <Pressable
                        hitSlop={8}
                        disabled={!week.bulkScheduleUuid || week.violationsLoading}
                        onPress={() => week.bulkScheduleUuid && fetchViolations(index, week.bulkScheduleUuid)}
                      >
                        {week.violationsLoading ? (
                          <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                          <MaterialIcons
                            name="refresh"
                            size={20}
                            color={week.bulkScheduleUuid ? Colors.primary : Colors.outline}
                          />
                        )}
                      </Pressable>
                    </View>

                    {!week.violationsCollapsed ? (
                      <View style={styles.violationsBody}>
                        {week.ruleViolations === null ? (
                          <Text style={styles.violationsEmptyText}>
                            {week.bulkScheduleUuid
                              ? 'Tap the refresh icon to check for rule violations.'
                              : 'Save a shift first to check for rule violations.'}
                          </Text>
                        ) : week.ruleViolations.length === 0 ? (
                          <Text style={styles.violationsEmptyText}>No rule violations.</Text>
                        ) : (
                          week.ruleViolations.map((employeeViolations) => (
                            <View key={employeeViolations.employee.uuid} style={styles.violationsEmployeeGroup}>
                              <Text style={styles.violationsEmployeeName}>
                                {employeeViolations.employee.first_name} {employeeViolations.employee.last_name}
                              </Text>
                              {employeeViolations.violations.map((violation) => (
                                <View key={violation.code} style={styles.violationRow}>
                                  <View
                                    style={[
                                      styles.violationDot,
                                      violation.severity === 'blocking' ? styles.violationDotBlocking : styles.violationDotWarning,
                                    ]}
                                  />
                                  <View style={styles.violationTextGroup}>
                                    <Text style={styles.violationLabel}>{violation.label}</Text>
                                    <Text style={styles.violationMessage}>{violation.message}</Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          ))
                        )}
                      </View>
                    ) : null}
                  </View>

                  {isResolvingWeek ? (
                    <View style={styles.weekLoadingOverlay}>
                      <ActivityIndicator color={Colors.primary} />
                    </View>
                  ) : null}
                </View>
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
                  <Button
                    label="+ Add Week"
                    onPress={handleAddWeek}
                    disabled={!addWeekDraft || isResolvingWeek}
                    loading={isResolvingWeek}
                  />
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={!!errorModal} transparent animationType="fade" onRequestClose={() => setErrorModal(undefined)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{errorModal?.title}</Text>
            <ScrollView style={styles.errorList}>
              {errorModal?.lines.map((line, index) => (
                <Text key={index} style={styles.errorListItem}>
                  • {line}
                </Text>
              ))}
            </ScrollView>
            <Button label="OK" onPress={() => setErrorModal(undefined)} />
          </View>
        </View>
      </Modal>

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
              label={`Publish (W${activeWeek.week.week_number})`}
              onPress={handlePublish}
              disabled={!activeWeek.bulkScheduleUuid || activeWeek.ruleViolations.length > 0}
              loading={publishMutation.isPending}
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
  activeWeekWrapper: {
    position: 'relative',
    gap: Spacing.gutter,
  },
  violationsCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.gutter,
  },
  violationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  violationsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    flex: 1,
  },
  violationsTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  violationsBadge: {
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.unit * 2,
    paddingVertical: 2,
  },
  violationsBadgeText: {
    ...Typography.labelSm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onErrorContainer,
  },
  violationsBody: {
    gap: Spacing.unit * 4,
  },
  violationsEmptyText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  violationsEmployeeGroup: {
    gap: Spacing.unit * 2,
  },
  violationsEmployeeName: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  violationRow: {
    flexDirection: 'row',
    gap: Spacing.unit * 2,
    paddingLeft: Spacing.unit * 2,
  },
  violationDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    marginTop: 6,
  },
  violationDotBlocking: {
    backgroundColor: Colors.error,
  },
  violationDotWarning: {
    backgroundColor: Colors.tertiary,
  },
  violationTextGroup: {
    flex: 1,
    gap: 2,
  },
  violationLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  violationMessage: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  weekLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.lg,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(11,28,48,0.4)',
  },
  sheet: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.gutter,
  },
  sheetTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  errorList: {
    maxHeight: 320,
  },
  errorListItem: {
    ...Typography.bodyMd,
    color: Colors.error,
    paddingVertical: Spacing.unit,
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
