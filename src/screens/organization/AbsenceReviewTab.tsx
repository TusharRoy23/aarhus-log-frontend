import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar, Button } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { ApplicationStatusColors } from '../../theme/status';
import { organizationApi, type AbsenceApplication } from '../../lib/api/organization';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { ApplicationStatus } from '../../lib/api/employee';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ISO datetime -> '15 Aug 2026, 09:30' (local time) — a small local
// formatter rather than importing AbsenceApplicationsTab's own, same
// "different domain, trivial formatter, not worth a cross-domain import"
// call already made elsewhere in this app (e.g. EmployeeWagesModal).
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.getDate();
  const month = MONTH_SHORT[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

function statusLabel(status: AbsenceApplication['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Pending applications first (what the admin actually needs to act on),
// newest first within each status group.
function sortApplications(applications: AbsenceApplication[]): AbsenceApplication[] {
  return [...applications].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === ApplicationStatus.Pending) return -1;
      if (b.status === ApplicationStatus.Pending) return 1;
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

export function AbsenceReviewTab() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['absence-applications-review'],
    queryFn: organizationApi.getAbsenceApplications,
  });
  const applications = sortApplications(data?.results ?? []);

  const [selected, setSelected] = useState<AbsenceApplication | null>(null);

  const reviewMutation = useMutation({
    mutationFn: ({ uuid, status }: { uuid: string; status: ApplicationStatus }) =>
      organizationApi.reviewAbsenceApplication(uuid, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-applications-review'] });
      setSelected(null);
    },
  });

  const reviewError = reviewMutation.isError
    ? getApiErrorMessage(reviewMutation.error, 'Failed to update this application.')
    : undefined;

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name="event-busy" size={20} color={Colors.primary} />
        <Text style={styles.sectionTitle}>Absence Applications</Text>
      </View>

      {isPending ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : isError ? (
        <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load absence applications.')}</Text>
      ) : applications.length === 0 ? (
        <Text style={styles.emptyText}>No absence applications yet.</Text>
      ) : (
        <View style={styles.list}>
          {applications.map((application) => {
            const statusColor = ApplicationStatusColors[application.status];
            const employeeName = `${application.employee.first_name} ${application.employee.last_name}`;
            return (
              <Pressable key={application.uuid} style={styles.row} onPress={() => setSelected(application)}>
                <Avatar label={employeeName} size={36} />
                <View style={styles.rowBody}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.employeeName} numberOfLines={1}>
                      {employeeName}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor.background }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor.text }]} />
                      <Text style={[styles.statusText, { color: statusColor.text }]}>
                        {statusLabel(application.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.typeText}>{application.absence_type.label}</Text>
                  <Text style={styles.metaText}>
                    {formatDateTime(application.start_time)} – {formatDateTime(application.end_time)}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={18} color={Colors.onSurfaceVariant} />
              </Pressable>
            );
          })}
        </View>
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          {selected ? (
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <View style={styles.sectionHeader}>
                  <Avatar label={`${selected.employee.first_name} ${selected.employee.last_name}`} size={40} />
                  <View style={styles.sheetHeaderText}>
                    <Text style={styles.sheetEmployeeName}>
                      {selected.employee.first_name} {selected.employee.last_name}
                    </Text>
                    <Text style={styles.sheetEmployeeCode}>{selected.employee.employee_code}</Text>
                  </View>
                </View>
                <Pressable onPress={() => setSelected(null)} hitSlop={8} accessibilityLabel="Close">
                  <MaterialIcons name="close" size={22} color={Colors.onSurfaceVariant} />
                </Pressable>
              </View>

              <View style={styles.detailList}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: ApplicationStatusColors[selected.status].background }]}>
                    <View style={[styles.statusDot, { backgroundColor: ApplicationStatusColors[selected.status].text }]} />
                    <Text style={[styles.statusText, { color: ApplicationStatusColors[selected.status].text }]}>
                      {statusLabel(selected.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Absence Type</Text>
                  <Text style={styles.detailValue}>{selected.absence_type.label}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Start</Text>
                  <Text style={styles.detailValue}>{formatDateTime(selected.start_time)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>End</Text>
                  <Text style={styles.detailValue}>{formatDateTime(selected.end_time)}</Text>
                </View>
                <View style={styles.noteBlock}>
                  <Text style={styles.detailLabel}>Note</Text>
                  <Text style={styles.detailValue}>{selected.note || 'No note provided.'}</Text>
                </View>
                {selected.status !== ApplicationStatus.Pending && selected.reviewed_by ? (
                  <View style={styles.noteBlock}>
                    <Text style={styles.detailLabel}>Reviewed By</Text>
                    <Text style={styles.detailValue}>
                      {selected.reviewed_by.first_name} {selected.reviewed_by.last_name} on{' '}
                      {formatDateTime(selected.reviewed_at)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}

              {selected.status === ApplicationStatus.Pending ? (
                <View style={styles.modalFooterRow}>
                  <Button
                    label="Decline"
                    variant="destructive"
                    onPress={() => reviewMutation.mutate({ uuid: selected.uuid, status: ApplicationStatus.Declined })}
                    loading={reviewMutation.isPending && reviewMutation.variables?.status === ApplicationStatus.Declined}
                    style={styles.modalFooterButton}
                  />
                  <Button
                    label="Accept"
                    onPress={() => reviewMutation.mutate({ uuid: selected.uuid, status: ApplicationStatus.Approved })}
                    loading={reviewMutation.isPending && reviewMutation.variables?.status === ApplicationStatus.Approved}
                    style={styles.modalFooterButton}
                  />
                </View>
              ) : (
                <Button label="Close" variant="secondary" onPress={() => setSelected(null)} />
              )}
            </View>
          ) : null}
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
    gap: Spacing.unit * 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  sectionTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  loading: {
    marginVertical: Spacing.unit * 2,
  },
  emptyText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  list: {
    gap: Spacing.unit * 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
    paddingVertical: Spacing.unit * 2,
    paddingHorizontal: Spacing.unit * 3,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.DEFAULT,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  employeeName: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
    flex: 1,
  },
  typeText: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  metaText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit,
    paddingHorizontal: Spacing.unit * 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  statusText: {
    ...Typography.labelSm,
    fontFamily: 'Inter_600SemiBold',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(11,28,48,0.4)',
  },
  sheet: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.gutter,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.unit * 2,
  },
  sheetHeaderText: {
    gap: 2,
  },
  sheetEmployeeName: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  sheetEmployeeCode: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  detailList: {
    gap: Spacing.unit * 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  detailLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  detailValue: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
    flexShrink: 1,
    textAlign: 'right',
  },
  noteBlock: {
    gap: Spacing.unit,
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: Spacing.unit * 3,
  },
  modalFooterButton: {
    flex: 1,
  },
});
