import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useAppSelector } from '../../store/hooks';
import type { Schedule, WorkWeek } from '../../lib/api/schedule';
import { parseDateOnly } from './schedule-format';

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const COLUMN_WIDTH = 220;

// Today gets its own distinct gradient to stand out; an upcoming day uses
// the app's own brand blue — same [primary, primaryContainer] pair
// SignUpScreen's BrandPanel gradient already uses; an already-passed day is
// muted grey/white, since there's nothing left to do with it.
const TODAY_GRADIENT: [string, string] = ['#7c3aed', '#be185d'];
const UPCOMING_GRADIENT: [string, string] = [Colors.primary, Colors.primaryContainer];
const PAST_GRADIENT: [string, string] = [Colors.outline, Colors.surfaceContainerLowest];

// A small fixed palette, picked deterministically per designation name, so
// the same role always gets the same dot color across the board without
// the backend needing to supply one.
const DESIGNATION_DOT_COLORS = ['#ea580c', '#2563eb', '#16a34a', '#9333ea', '#d97706', '#0891b2', '#dc2626'];
function colorForDesignation(designation: string): string {
  let hash = 0;
  for (let index = 0; index < designation.length; index++) hash = (hash * 31 + designation.charCodeAt(index)) >>> 0;
  return DESIGNATION_DOT_COLORS[hash % DESIGNATION_DOT_COLORS.length];
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDaysToDate(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isPastDay(date: Date, today: Date): boolean {
  return startOfDay(date).getTime() < startOfDay(today).getTime();
}

function formatTimeHHMM(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

interface TimeGroup {
  start: string;
  end: string;
  schedules: Schedule[];
}

// Same "group entries sharing a start/end under one time heading" idea as
// BulkScheduleWeekGrid's own groupEntriesByTime, reimplemented here against
// raw Schedule[] (full employee objects) rather than that grid's trimmed
// BulkShiftEntry — this board is independent of the editable grid's data
// model on purpose, so redesigning this view never risks the admin
// create/edit flow.
function groupSchedulesByTime(schedules: Schedule[]): TimeGroup[] {
  const groups = new Map<string, Schedule[]>();
  for (const schedule of schedules) {
    const start = formatTimeHHMM(new Date(schedule.start_time));
    const end = formatTimeHHMM(new Date(schedule.end_time));
    const key = `${start}|${end}`;
    const existing = groups.get(key);
    if (existing) existing.push(schedule);
    else groups.set(key, [schedule]);
  }
  return [...groups.entries()]
    .map(([key, groupSchedules]) => {
      const [start, end] = key.split('|');
      return { start, end, schedules: groupSchedules };
    })
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

// No explicit "is this a night shift" field exists anywhere in the API —
// this is a guessed display heuristic (crosses midnight, or ends at/after
// 8pm), not a real business rule. Flagged here in case it needs to match
// something more precise later (e.g. the actual night-shift wage window).
function isNightGroup(group: TimeGroup): boolean {
  const startMinutes = timeToMinutes(group.start);
  const endMinutes = timeToMinutes(group.end);
  return endMinutes <= startMinutes || endMinutes >= 20 * 60;
}

export interface PublishedScheduleBoardProps {
  week: WorkWeek;
  schedules: Schedule[];
}

// A horizontally-scrolling, task-board-style read-only view of one
// published week — one gradient-headed column per day, shifts grouped
// under a shared time heading. Built as its own component (not a
// BulkScheduleWeekGrid readOnly variant) since the visual language here
// (gradients, per-designation dot colors, "is this my shift" highlighting)
// is deliberately very different from the editable grid, and conflating
// the two would risk the admin create/edit experience for a purely
// cosmetic change.
export function PublishedScheduleBoard({ week, schedules }: PublishedScheduleBoardProps) {
  const currentUserEmail = useAppSelector((state) => state.auth.user?.email);
  const today = useMemo(() => new Date(), []);

  const weekStart = useMemo(() => parseDateOnly(week.start_date), [week.start_date]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => ({ index, date: addDaysToDate(weekStart, index) })),
    [weekStart],
  );

  const schedulesByDay = useMemo(() => {
    const map = new Map<number, Schedule[]>();
    for (const day of days) map.set(day.index, []);
    for (const schedule of schedules) {
      const dayIndex = Math.round(
        (startOfDay(new Date(schedule.start_time)).getTime() - weekStart.getTime()) / MS_PER_DAY,
      );
      if (dayIndex >= 0 && dayIndex <= 6) map.get(dayIndex)?.push(schedule);
    }
    return map;
  }, [schedules, days, weekStart]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.boardScroll}
      contentContainerStyle={styles.board}
    >
      {days.map((day) => {
        const isToday = isSameDay(day.date, today);
        const isPast = !isToday && isPastDay(day.date, today);
        const daySchedules = schedulesByDay.get(day.index) ?? [];
        const timeGroups = groupSchedulesByTime(daySchedules);

        return (
          <View key={day.index} style={styles.column}>
            <LinearGradient
              colors={isToday ? TODAY_GRADIENT : isPast ? PAST_GRADIENT : UPCOMING_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.columnHeader}
            >
              <Text style={[styles.columnHeaderLabel, isPast && styles.columnHeaderTextPast]}>
                {isToday ? 'Today' : DAY_LABELS[day.index]}
              </Text>
              <View style={styles.columnHeaderDate}>
                <Text style={[styles.columnHeaderDateDay, isPast && styles.columnHeaderTextPast]}>{day.date.getDate()}</Text>
                <Text style={[styles.columnHeaderDateMonth, isPast && styles.columnHeaderTextPastMuted]}>
                  {MONTH_SHORT[day.date.getMonth()]}
                </Text>
              </View>
            </LinearGradient>

            <ScrollView style={styles.columnBody} contentContainerStyle={styles.columnBodyContent}>
              {timeGroups.length === 0 ? (
                <Text style={styles.emptyText}>No shifts</Text>
              ) : (
                timeGroups.map((group) => (
                  <View key={`${group.start}-${group.end}`} style={styles.timeGroup}>
                    <View style={styles.timeGroupHeader}>
                      <Text style={styles.timeGroupHeaderText}>
                        {group.start} - {group.end}
                      </Text>
                      {isNightGroup(group) ? (
                        <MaterialIcons name="nightlight" size={14} color={Colors.onSurfaceVariant} />
                      ) : null}
                    </View>

                    {group.schedules.map((schedule) => {
                      const employee = schedule.employee;
                      const isMe = !!employee && employee.email === currentUserEmail;
                      const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Open Shift';
                      return (
                        <View key={schedule.uuid} style={styles.card}>
                          {employee ? (
                            <Avatar label={employeeName} size={28} />
                          ) : (
                            <View style={styles.openAvatar}>
                              <MaterialIcons name="person-outline" size={14} color={Colors.primary} />
                            </View>
                          )}
                          <View style={styles.cardText}>
                            <Text style={[styles.cardName, isMe && styles.cardNameMe]} numberOfLines={1}>
                              {employeeName}
                            </Text>
                            {schedule.role ? (
                              <View style={styles.cardRoleRow}>
                                <View
                                  style={[
                                    styles.cardRoleDot,
                                    { backgroundColor: colorForDesignation(schedule.role.name) },
                                  ]}
                                />
                                <Text style={styles.cardRoleText} numberOfLines={1}>
                                  {schedule.role.name}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // The ScrollView's own `style` (not contentContainerStyle) needs flex: 1
  // so it actually fills BulkScheduleViewScreen's now-fixed-height content
  // area — contentContainerStyle alone only affects the scrollable content,
  // not the ScrollView's own cross-axis size.
  boardScroll: {
    flex: 1,
  },
  board: {
    gap: Spacing.unit * 3,
    paddingBottom: Spacing.unit * 2,
  },
  // height: '100%' (not flex: 1 — flex only governs the ScrollView content
  // container's main axis, which is horizontal here) resolves against
  // boardScroll's own concrete height, making every column match it
  // regardless of how many shifts it holds.
  column: {
    width: COLUMN_WIDTH,
    height: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerLow,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.unit * 3,
    paddingVertical: Spacing.unit * 3,
  },
  columnHeaderLabel: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  columnHeaderDate: {
    alignItems: 'flex-end',
  },
  columnHeaderDateDay: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
    lineHeight: 18,
  },
  columnHeaderDateMonth: {
    ...Typography.labelSm,
    color: 'rgba(255,255,255,0.85)',
  },
  // The past gradient fades to near-white on the right, so header text
  // switches to a dark color instead of staying white like the other two
  // (today/upcoming) gradients, which both stay dark/saturated throughout.
  columnHeaderTextPast: {
    color: Colors.onSurfaceVariant,
  },
  columnHeaderTextPastMuted: {
    color: Colors.outline,
  },
  // The ScrollView itself (style, not contentContainerStyle) — fills
  // whatever's left of `column`'s now-fixed height below columnHeader, and
  // scrolls independently so a day with more shifts than fit doesn't get
  // clipped by that fixed height.
  columnBody: {
    flex: 1,
  },
  columnBodyContent: {
    padding: Spacing.unit * 2,
    gap: Spacing.unit * 3,
    minHeight: 120,
  },
  emptyText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    paddingHorizontal: Spacing.unit,
    paddingVertical: Spacing.unit * 2,
  },
  timeGroup: {
    gap: Spacing.unit * 2,
  },
  timeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit,
    paddingHorizontal: Spacing.unit,
  },
  timeGroupHeaderText: {
    ...Typography.labelSm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.unit * 2,
  },
  openAvatar: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  cardNameMe: {
    color: Colors.primary,
  },
  cardRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit,
  },
  cardRoleDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  cardRoleText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    flexShrink: 1,
  },
});
