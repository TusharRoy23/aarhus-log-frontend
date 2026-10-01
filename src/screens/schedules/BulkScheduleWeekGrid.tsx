import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ActionMenu, Avatar, Button, Checkbox, DateTimeField, SelectField, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { workLocationApi } from '../../lib/api/work-location';
import type { WorkWeek } from '../../lib/api/schedule';
import { formatWeekLabel, parseDateOnly } from './schedule-format';

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_COLUMN_WIDTH = 176;

export interface BulkEmployeeRow {
  uuid: string;
  name: string;
  designation: string;
}

// One shift, for one employee, on one day of the week being edited. Replaces
// the earlier `Record<"${employeeUuid}_${dayIndex}", cell>` model (one slot
// per employee per day) — that model couldn't represent more than one shift
// per employee per day, or render "who's on this day" without first listing
// every employee as a row. This is a flat list instead: any number of
// entries per day, per employee (including the same employee twice, e.g. a
// split shift), grouped for display by day and then by matching start/end
// time (see groupEntriesByTime below). `id` is a client-only identifier
// (never sent to the API) so entries sharing the same employee+day+time
// still have distinct identities to edit/remove individually.
export interface BulkShiftEntry {
  id: string;
  employeeUuid: string;
  /** 0 (Mon) .. 6 (Sun) */
  dayIndex: number;
  /** 'HH:MM' */
  start: string;
  /** 'HH:MM' */
  end: string;
  /** Minutes as a numeric string, or '' when not set. */
  breakMinutes: string;
  workLocationUuid?: string;
  isScannable: boolean;
}

let entryIdCounter = 0;
function createEntryId(): string {
  return `entry-${Date.now()}-${entryIdCounter++}`;
}

function addDaysToDate(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// The 7 calendar dates of `week`, Monday..Sunday, parsed off its
// authoritative `start_date` (server-provided, not client-computed).
function getWeekDays(week: WorkWeek): { index: number; date: Date }[] {
  const start = parseDateOnly(week.start_date);
  return Array.from({ length: 7 }, (_, index) => ({ index, date: addDaysToDate(start, index) }));
}

function formatDayDate(date: Date): string {
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

// End time-of-day at or before start means the shift crosses midnight (e.g.
// the mockup's 23:00 -> 07:00 security shift) — same overnight convention
// `formatTimeRange`/CreateShiftForm already use elsewhere in this codebase,
// applied here to duration math instead of display.
function entryDurationHours(entry: Pick<BulkShiftEntry, 'start' | 'end' | 'breakMinutes'>): number {
  const startMinutes = timeToMinutes(entry.start);
  let endMinutes = timeToMinutes(entry.end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  const breakMinutes = parseInt(entry.breakMinutes, 10) || 0;
  return Math.max(endMinutes - startMinutes - breakMinutes, 0) / 60;
}

interface TimeGroup {
  start: string;
  end: string;
  entries: BulkShiftEntry[];
}

// Entries sharing the exact same start/end on a given day are shown together
// under one time heading (matching the reference layout — "08:00 - 08:15"
// with everyone at that time listed underneath), sorted earliest first.
function groupEntriesByTime(entries: BulkShiftEntry[]): TimeGroup[] {
  const groups = new Map<string, BulkShiftEntry[]>();
  for (const entry of entries) {
    const key = `${entry.start}|${entry.end}`;
    const existing = groups.get(key);
    if (existing) existing.push(entry);
    else groups.set(key, [entry]);
  }
  return [...groups.values()]
    .map((groupEntries) => ({ start: groupEntries[0].start, end: groupEntries[0].end, entries: groupEntries }))
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

export interface BulkScheduleWeekGridProps {
  employees: BulkEmployeeRow[];
  week: WorkWeek;
  entries: BulkShiftEntry[];
  onEntriesChange: (entries: BulkShiftEntry[]) => void;
  /** Omit both to lock the week (editing an existing bulk schedule) — the
   * header then shows the week as static text instead of a change-week
   * dropdown, since editing is scoped to exactly this one week. */
  weekOptions?: WorkWeek[];
  onSelectWeek?: (week: WorkWeek) => void;
  /** Renders every day column as plain, non-interactive text and skips the
   * shift editor entirely — for viewing an already-published schedule (e.g.
   * an employee's read-only "Published Schedule" detail) rather than
   * building or editing one. `onEntriesChange` is never invoked in this mode. */
  readOnly?: boolean;
}

type EditorTarget = { mode: 'add'; dayIndex: number } | { mode: 'edit'; entry: BulkShiftEntry };

// The always-active, fully expanded week card — collapsed (inactive) weeks
// are a separate, lightweight summary row rendered by BulkScheduleScreen,
// which never mounts this component for them. All entry state lives in the
// parent's `entries` array (passed in, reported back via `onEntriesChange`)
// rather than local state here, so collapsing/reactivating a week never
// loses edits — the same lesson already learned twice this session about
// not trusting mount/unmount to preserve UI state.
export function BulkScheduleWeekGrid({
  employees,
  week,
  entries,
  onEntriesChange,
  weekOptions,
  onSelectWeek,
  readOnly = false,
}: BulkScheduleWeekGridProps) {
  const days = useMemo(() => getWeekDays(week), [week]);
  const employeeByUuid = useMemo(() => new Map(employees.map((employee) => [employee.uuid, employee])), [employees]);

  // No shift editor exists in read-only mode, so this list would otherwise
  // be fetched for nothing — skip the request entirely.
  const { data: workLocationData } = useQuery({
    queryKey: ['work-locations'],
    queryFn: workLocationApi.list,
    enabled: !readOnly,
  });
  const workLocationOptions = (workLocationData?.results ?? [])
    .filter((location) => location.is_active)
    .map((location) => ({ label: `${location.name} (${location.client_name})`, value: location.uuid }));

  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);
  const [draftEmployeeUuid, setDraftEmployeeUuid] = useState('');
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [draftBreakMinutes, setDraftBreakMinutes] = useState('');
  const [draftWorkLocationUuid, setDraftWorkLocationUuid] = useState('');
  const [draftIsScannable, setDraftIsScannable] = useState(true);
  const [entryError, setEntryError] = useState<string | undefined>();

  const openAddEditor = (dayIndex: number) => {
    setDraftEmployeeUuid('');
    setDraftStart('');
    setDraftEnd('');
    setDraftBreakMinutes('');
    setDraftWorkLocationUuid('');
    setDraftIsScannable(true);
    setEntryError(undefined);
    setEditorTarget({ mode: 'add', dayIndex });
  };
  const openEditEditor = (entry: BulkShiftEntry) => {
    setDraftEmployeeUuid(entry.employeeUuid);
    setDraftStart(entry.start);
    setDraftEnd(entry.end);
    setDraftBreakMinutes(entry.breakMinutes);
    setDraftWorkLocationUuid(entry.workLocationUuid ?? '');
    setDraftIsScannable(entry.isScannable);
    setEntryError(undefined);
    setEditorTarget({ mode: 'edit', entry });
  };
  const closeEditor = () => setEditorTarget(null);

  const handleSaveEntry = () => {
    if (!editorTarget) return;
    if (!draftEmployeeUuid) {
      setEntryError('Please select an employee.');
      return;
    }
    if (!draftStart || !draftEnd) {
      setEntryError('Please set both a start and end time.');
      return;
    }
    // Equal start/end is the only combination actually rejected — a
    // zero-duration shift. End earlier than start otherwise means an
    // overnight shift crossing into the next day (e.g. 23:00-07:00), a
    // deliberately supported case (see entryDurationHours/
    // buildBulkScheduleItems' day-rollover handling), not an error to block.
    if (draftStart === draftEnd) {
      setEntryError("Start and end time can't be the same.");
      return;
    }
    const dayIndex = editorTarget.mode === 'add' ? editorTarget.dayIndex : editorTarget.entry.dayIndex;
    const currentId = editorTarget.mode === 'edit' ? editorTarget.entry.id : null;
    const isDuplicate = entries.some(
      (entry) =>
        entry.id !== currentId &&
        entry.dayIndex === dayIndex &&
        entry.employeeUuid === draftEmployeeUuid &&
        entry.start === draftStart &&
        entry.end === draftEnd,
    );
    if (isDuplicate) {
      setEntryError('This employee already has a shift at this time.');
      return;
    }
    setEntryError(undefined);

    const nextEntry: BulkShiftEntry = {
      id: currentId ?? createEntryId(),
      employeeUuid: draftEmployeeUuid,
      dayIndex,
      start: draftStart,
      end: draftEnd,
      breakMinutes: draftBreakMinutes,
      isScannable: draftIsScannable,
      ...(draftWorkLocationUuid ? { workLocationUuid: draftWorkLocationUuid } : {}),
    };
    onEntriesChange(
      currentId
        ? entries.map((entry) => (entry.id === currentId ? nextEntry : entry))
        : [...entries, nextEntry],
    );
    closeEditor();
  };

  const handleRemoveEntry = () => {
    if (editorTarget?.mode !== 'edit') return;
    onEntriesChange(entries.filter((entry) => entry.id !== editorTarget.entry.id));
    closeEditor();
  };

  const entriesByDay = useMemo(() => {
    const byDay = new Map<number, BulkShiftEntry[]>();
    for (const day of days) byDay.set(day.index, []);
    for (const entry of entries) byDay.get(entry.dayIndex)?.push(entry);
    return byDay;
  }, [entries, days]);

  const { totalHours, scheduledEmployeeCount, hasFullCoverage } = useMemo(() => {
    let hours = 0;
    const scheduledEmployees = new Set<string>();
    const coveredDays = new Set<number>();
    for (const entry of entries) {
      hours += entryDurationHours(entry);
      scheduledEmployees.add(entry.employeeUuid);
      coveredDays.add(entry.dayIndex);
    }
    return {
      totalHours: hours,
      scheduledEmployeeCount: scheduledEmployees.size,
      // Simple v1 heuristic — every day has at least one person on, not a
      // real staffing-adequacy check. See plan notes for why this is a
      // placeholder, not a fully-specified business rule.
      hasFullCoverage: coveredDays.size === 7,
    };
  }, [entries]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <MaterialIcons name="calendar-today" size={18} color={Colors.primary} />
          <Text style={styles.headerTitle}>{readOnly ? 'PUBLISHED SCHEDULE' : 'SELECT WEEK TO SCHEDULE'}</Text>
        </View>
        {!readOnly ? (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        ) : null}
      </View>

      {weekOptions && onSelectWeek ? (
        <ActionMenu
          trigger={
            <View style={styles.weekTrigger}>
              <Text style={styles.weekTriggerText}>{formatWeekLabel(week)}</Text>
              <MaterialIcons name="expand-more" size={20} color={Colors.primary} />
            </View>
          }
          items={weekOptions.map((option) => ({
            label: formatWeekLabel(option),
            icon: 'calendar-today' as const,
            onPress: () => onSelectWeek(option),
          }))}
        />
      ) : (
        <View style={styles.weekTrigger}>
          <Text style={styles.weekTriggerText}>{formatWeekLabel(week)}</Text>
        </View>
      )}

      <View style={styles.tableWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.daysRow}>
            {days.map((day) => {
              const dayEntries = entriesByDay.get(day.index) ?? [];
              const timeGroups = groupEntriesByTime(dayEntries);
              return (
                <View key={day.index} style={styles.dayColumn}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayHeaderLabel}>{DAY_LABELS[day.index]}</Text>
                    <Text style={styles.dayHeaderDate}>{formatDayDate(day.date)}</Text>
                  </View>

                  <View style={styles.dayBody}>
                    {timeGroups.map((group) => (
                      <View key={`${group.start}-${group.end}`} style={styles.timeGroup}>
                        <Text style={styles.timeGroupHeader}>
                          {group.start} - {group.end}
                        </Text>
                        {group.entries.map((entry) => {
                          const employee = employeeByUuid.get(entry.employeeUuid);
                          return (
                            <Pressable
                              key={entry.id}
                              style={styles.employeeRow}
                              onPress={readOnly ? undefined : () => openEditEditor(entry)}
                              disabled={readOnly}
                            >
                              <Avatar label={employee?.name ?? '?'} size={24} />
                              <Text style={styles.employeeRowName} numberOfLines={1}>
                                {employee?.name ?? 'Unknown employee'}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ))}

                    {!readOnly ? (
                      <Pressable style={styles.addTimespanRow} onPress={() => openAddEditor(day.index)}>
                        <MaterialIcons name="add" size={16} color={Colors.primary} />
                        <Text style={styles.addTimespanText}>Add more</Text>
                      </Pressable>
                    ) : dayEntries.length === 0 ? (
                      <Text style={styles.emptyDayText}>No shifts</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            Total: <Text style={styles.footerTextStrong}>{Math.round(totalHours)} hrs</Text> •{' '}
            {scheduledEmployeeCount} Employees scheduled
          </Text>
          <View style={styles.coverageRow}>
            <View style={[styles.coverageDot, hasFullCoverage && styles.coverageDotFull]} />
            <Text style={styles.coverageText}>{hasFullCoverage ? 'Full Coverage' : 'Partial Coverage'}</Text>
          </View>
        </View>
      </View>

      <Modal visible={!!editorTarget} transparent animationType="fade" onRequestClose={closeEditor}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeEditor} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            {editorTarget ? (
              <>
                <Text style={styles.sheetTitle}>
                  {editorTarget.mode === 'edit' ? 'Edit Shift' : 'Add Shift'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {DAY_LABELS[editorTarget.mode === 'add' ? editorTarget.dayIndex : editorTarget.entry.dayIndex]}{' '}
                  {formatDayDate(
                    addDaysToDate(
                      parseDateOnly(week.start_date),
                      editorTarget.mode === 'add' ? editorTarget.dayIndex : editorTarget.entry.dayIndex,
                    ),
                  )}
                </Text>

                <View style={styles.sheetFields}>
                  <SelectField
                    label="Employee"
                    placeholder="Select employee"
                    value={draftEmployeeUuid}
                    options={employees.map((employee) => ({ label: employee.name, value: employee.uuid }))}
                    onChange={setDraftEmployeeUuid}
                    icon={<MaterialIcons name="person" size={20} color={Colors.outline} />}
                  />
                  <DateTimeField label="Start" mode="time" value={draftStart} onChange={setDraftStart} />
                  <DateTimeField label="End" mode="time" value={draftEnd} onChange={setDraftEnd} />
                  <TextField
                    label="Break Time"
                    placeholder="e.g. 30"
                    value={draftBreakMinutes}
                    onChangeText={(value) => setDraftBreakMinutes(value.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    icon={<MaterialIcons name="free-breakfast" size={20} color={Colors.outline} />}
                    rightElement={<Text style={styles.unitLabel}>min</Text>}
                  />
                  {/* Same "only show if there's at least one active location"
                      convention CreateShiftForm already uses — omitted from
                      the payload entirely when left unselected. */}
                  {workLocationOptions.length > 0 ? (
                    <SelectField
                      label="Work Location"
                      placeholder="Select Location"
                      value={draftWorkLocationUuid}
                      options={workLocationOptions}
                      onChange={setDraftWorkLocationUuid}
                      icon={<MaterialIcons name="location-on" size={20} color={Colors.outline} />}
                    />
                  ) : null}
                  <View style={styles.scannableRow}>
                    <Checkbox checked={draftIsScannable} onChange={setDraftIsScannable} />
                    <Text style={styles.scannableLabel}>Scannable QR Code</Text>
                  </View>
                </View>

                {entryError ? <Text style={styles.errorText}>{entryError}</Text> : null}

                <View style={styles.sheetFooter}>
                  {editorTarget.mode === 'edit' ? (
                    <Button label="Remove" variant="destructive" onPress={handleRemoveEntry} style={styles.sheetButton} />
                  ) : null}
                  <Button label="Close" variant="secondary" onPress={closeEditor} style={styles.sheetButton} />
                  <Button label="Save" onPress={handleSaveEntry} style={styles.sheetButton} />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.gutter,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  headerTitle: {
    ...Typography.labelSm,
    color: Colors.onSurface,
  },
  activeBadge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: Spacing.unit * 3,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  activeBadgeText: {
    ...Typography.labelSm,
    color: Colors.onSecondaryContainer,
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
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.DEFAULT,
    overflow: 'hidden',
  },
  daysRow: {
    flexDirection: 'row',
  },
  dayColumn: {
    width: DAY_COLUMN_WIDTH,
    borderLeftWidth: 1,
    borderLeftColor: Colors.outlineVariant,
  },
  dayHeader: {
    paddingHorizontal: Spacing.unit * 3,
    paddingVertical: Spacing.unit * 3,
    backgroundColor: Colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  dayHeaderLabel: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  dayHeaderDate: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  dayBody: {
    padding: Spacing.unit * 2,
    gap: Spacing.unit * 3,
    minHeight: 120,
  },
  timeGroup: {
    gap: Spacing.unit,
  },
  timeGroupHeader: {
    ...Typography.labelSm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
    paddingHorizontal: Spacing.unit,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    paddingHorizontal: Spacing.unit,
    paddingVertical: Spacing.unit * 2,
    borderRadius: Radius.sm,
  },
  employeeRowName: {
    ...Typography.labelSm,
    color: Colors.onSurface,
    flexShrink: 1,
  },
  addTimespanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit,
    paddingHorizontal: Spacing.unit,
    paddingVertical: Spacing.unit * 2,
  },
  addTimespanText: {
    ...Typography.labelSm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  emptyDayText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    paddingHorizontal: Spacing.unit,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.unit * 2,
    padding: Spacing.unit * 3,
    backgroundColor: Colors.surfaceContainerLow,
  },
  footerText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  footerTextStrong: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  coverageDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.outline,
  },
  coverageDotFull: {
    backgroundColor: Colors.primary,
  },
  coverageText: {
    ...Typography.labelSm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
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
  sheetSubtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    marginTop: -Spacing.unit * 2,
  },
  sheetFields: {
    gap: Spacing.unit * 4,
  },
  unitLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  scannableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  scannableLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: Spacing.gutter,
  },
  sheetButton: {
    flex: 1,
  },
});
