import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ActionMenu, Button, Checkbox, DateTimeField, SelectField, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { workLocationApi } from '../../lib/api/work-location';
import type { WorkWeek } from '../../lib/api/schedule';
import { formatWeekLabel, parseDateOnly } from './schedule-format';

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const HEADER_ROW_HEIGHT = 48;
const CELL_ROW_HEIGHT = 64;
const DAY_COLUMN_WIDTH = 84;

export interface BulkEmployeeRow {
  uuid: string;
  name: string;
  designation: string;
}

export interface BulkCellValue {
  /** 'HH:MM' */
  start: string;
  /** 'HH:MM' */
  end: string;
  /** Minutes as a numeric string, or '' when not set. */
  breakMinutes: string;
  workLocationUuid?: string;
  isScannable: boolean;
}

/** `${employeeUuid}_${dayIndex}` — dayIndex is 0 (Mon) .. 6 (Sun). */
export type BulkCellKey = string;

export function bulkCellKey(employeeUuid: string, dayIndex: number): BulkCellKey {
  return `${employeeUuid}_${dayIndex}`;
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

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

// End time-of-day at or before start means the shift crosses midnight (e.g.
// the mockup's 23:00 -> 07:00 security shift) — same overnight convention
// `formatTimeRange`/CreateShiftForm already use elsewhere in this codebase,
// applied here to duration math instead of display.
function cellDurationHours(cell: BulkCellValue): number {
  const startMinutes = timeToMinutes(cell.start);
  let endMinutes = timeToMinutes(cell.end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  const breakMinutes = parseInt(cell.breakMinutes, 10) || 0;
  return Math.max(endMinutes - startMinutes - breakMinutes, 0) / 60;
}

export interface BulkScheduleWeekGridProps {
  employees: BulkEmployeeRow[];
  week: WorkWeek;
  cells: Record<BulkCellKey, BulkCellValue | undefined>;
  onCellChange: (key: BulkCellKey, value: BulkCellValue | undefined) => void;
  weekOptions: WorkWeek[];
  onSelectWeek: (week: WorkWeek) => void;
}

// The always-active, fully expanded week card — collapsed (inactive) weeks
// are a separate, lightweight summary row rendered by BulkScheduleScreen,
// which never mounts this component for them. All cell state lives in the
// parent's `cells` map (passed in, reported back via `onCellChange`) rather
// than local state here, so collapsing/reactivating a week never loses
// edits — the same lesson already learned twice this session about not
// trusting mount/unmount to preserve UI state.
export function BulkScheduleWeekGrid({
  employees,
  week,
  cells,
  onCellChange,
  weekOptions,
  onSelectWeek,
}: BulkScheduleWeekGridProps) {
  const days = useMemo(() => getWeekDays(week), [week]);

  const { data: workLocationData } = useQuery({ queryKey: ['work-locations'], queryFn: workLocationApi.list });
  const workLocationOptions = (workLocationData?.results ?? [])
    .filter((location) => location.is_active)
    .map((location) => ({ label: `${location.name} (${location.client_name})`, value: location.uuid }));

  const [editorTarget, setEditorTarget] = useState<{ employee: BulkEmployeeRow; dayIndex: number } | null>(null);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [draftBreakMinutes, setDraftBreakMinutes] = useState('');
  const [draftWorkLocationUuid, setDraftWorkLocationUuid] = useState('');
  const [draftIsScannable, setDraftIsScannable] = useState(true);

  const openEditor = (employee: BulkEmployeeRow, dayIndex: number) => {
    const existing = cells[bulkCellKey(employee.uuid, dayIndex)];
    setDraftStart(existing?.start ?? '');
    setDraftEnd(existing?.end ?? '');
    setDraftBreakMinutes(existing?.breakMinutes ?? '');
    setDraftWorkLocationUuid(existing?.workLocationUuid ?? '');
    setDraftIsScannable(existing?.isScannable ?? true);
    setEditorTarget({ employee, dayIndex });
  };
  const closeEditor = () => setEditorTarget(null);

  const handleSaveCell = () => {
    if (!editorTarget || !draftStart || !draftEnd) return;
    onCellChange(bulkCellKey(editorTarget.employee.uuid, editorTarget.dayIndex), {
      start: draftStart,
      end: draftEnd,
      breakMinutes: draftBreakMinutes,
      isScannable: draftIsScannable,
      ...(draftWorkLocationUuid ? { workLocationUuid: draftWorkLocationUuid } : {}),
    });
    closeEditor();
  };

  const handleClearCell = () => {
    if (!editorTarget) return;
    onCellChange(bulkCellKey(editorTarget.employee.uuid, editorTarget.dayIndex), undefined);
    closeEditor();
  };

  const { totalHours, scheduledEmployeeCount, hasFullCoverage } = useMemo(() => {
    let hours = 0;
    const scheduledEmployees = new Set<string>();
    const coveredDays = new Set<number>();
    for (const employee of employees) {
      for (const day of days) {
        const cell = cells[bulkCellKey(employee.uuid, day.index)];
        if (!cell) continue;
        hours += cellDurationHours(cell);
        scheduledEmployees.add(employee.uuid);
        coveredDays.add(day.index);
      }
    }
    return {
      totalHours: hours,
      scheduledEmployeeCount: scheduledEmployees.size,
      // Simple v1 heuristic — every day has at least one person on, not a
      // real staffing-adequacy check. See plan notes for why this is a
      // placeholder, not a fully-specified business rule.
      hasFullCoverage: coveredDays.size === 7,
    };
  }, [employees, days, cells]);

  const isEditingExistingCell =
    !!editorTarget && !!cells[bulkCellKey(editorTarget.employee.uuid, editorTarget.dayIndex)];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <MaterialIcons name="calendar-today" size={18} color={Colors.primary} />
          <Text style={styles.headerTitle}>SELECT WEEK TO SCHEDULE</Text>
        </View>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      </View>

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

      <View style={styles.tableWrapper}>
        <View style={styles.tableBody}>
          <View style={styles.employeeColumn}>
            <View style={[styles.employeeColumnHeaderCell, styles.headerCellHeight]}>
              <Text style={styles.employeeColumnHeaderText}>EMPLOYEE</Text>
            </View>
            {employees.map((employee) => (
              <View key={employee.uuid} style={[styles.employeeCell, styles.cellRowHeight]}>
                <Text style={styles.employeeName} numberOfLines={1}>
                  {employee.name}
                </Text>
                <View style={styles.designationPill}>
                  <Text style={styles.designationText}>{employee.designation}</Text>
                </View>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={[styles.dayHeaderRow, styles.headerCellHeight]}>
                {days.map((day) => (
                  <View key={day.index} style={styles.dayHeaderCell}>
                    <Text style={styles.dayHeaderLabel}>{DAY_LABELS[day.index]}</Text>
                    <Text style={styles.dayHeaderNumber}>{day.date.getDate()}</Text>
                  </View>
                ))}
              </View>

              {employees.map((employee) => (
                <View key={employee.uuid} style={[styles.dayCellsRow, styles.cellRowHeight]}>
                  {days.map((day) => {
                    const cell = cells[bulkCellKey(employee.uuid, day.index)];
                    return (
                      <Pressable
                        key={day.index}
                        style={[styles.dayCell, cell ? styles.dayCellFilled : styles.dayCellOff]}
                        onPress={() => openEditor(employee, day.index)}
                      >
                        {cell ? (
                          <>
                            <Text style={styles.cellStartText}>{cell.start}</Text>
                            <Text style={styles.cellEndText}>{cell.end}</Text>
                          </>
                        ) : (
                          <Text style={styles.cellOffText}>Off</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            Total: <Text style={styles.footerTextStrong}>{Math.round(totalHours)} hrs</Text> • {employees.length}{' '}
            Employees scheduled
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
                <Text style={styles.sheetTitle}>{editorTarget.employee.name}</Text>
                <Text style={styles.sheetSubtitle}>
                  {DAY_LABELS[editorTarget.dayIndex]}{' '}
                  {addDaysToDate(parseDateOnly(week.start_date), editorTarget.dayIndex).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>

                <View style={styles.sheetFields}>
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

                <View style={styles.sheetFooter}>
                  {isEditingExistingCell ? (
                    <Button label="Clear" variant="destructive" onPress={handleClearCell} style={styles.sheetButton} />
                  ) : null}
                  <Button label="Close" variant="secondary" onPress={closeEditor} style={styles.sheetButton} />
                  <Button label="Save" onPress={handleSaveCell} style={styles.sheetButton} />
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
  tableBody: {
    flexDirection: 'row',
  },
  headerCellHeight: {
    height: HEADER_ROW_HEIGHT,
  },
  cellRowHeight: {
    height: CELL_ROW_HEIGHT,
  },
  employeeColumn: {
    width: 132,
    borderRightWidth: 1,
    borderRightColor: Colors.outlineVariant,
  },
  employeeColumnHeaderCell: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.unit * 3,
    backgroundColor: Colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  employeeColumnHeaderText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  employeeCell: {
    justifyContent: 'center',
    gap: Spacing.unit,
    paddingHorizontal: Spacing.unit * 3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  employeeName: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  designationPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.unit * 2,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  designationText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  dayHeaderCell: {
    width: DAY_COLUMN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  dayHeaderNumber: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  dayCellsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  dayCell: {
    width: DAY_COLUMN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: Colors.outlineVariant,
  },
  dayCellFilled: {
    backgroundColor: Colors.secondaryContainer,
  },
  dayCellOff: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  cellStartText: {
    ...Typography.labelSm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSecondaryContainer,
  },
  cellEndText: {
    ...Typography.labelSm,
    color: Colors.onSecondaryContainer,
  },
  cellOffText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
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
