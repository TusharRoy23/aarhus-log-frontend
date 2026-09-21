import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, Checkbox, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { organizationApi, type UpdateOrganizationPayload } from '../../lib/api/organization';
import { Resources } from '../../lib/api/permission';
import { getApiErrorMessage } from '../../lib/api/base_api';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function OrganizationSettingsScreen() {
  const queryClient = useQueryClient();

  const { data: organization, isPending, isError, error } = useQuery({
    queryKey: ['organization'],
    queryFn: organizationApi.get,
  });

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [weekendDays, setWeekendDays] = useState<number[]>([]);
  // The record loads asynchronously with no route param to key a "have we
  // seeded yet" check off of (unlike e.g. CreateShiftScreen's `?id=`) — this
  // flag is that guard instead, so a background refetch of ['organization']
  // never stomps on an in-progress edit.
  const [isSeeded, setIsSeeded] = useState(false);

  useEffect(() => {
    if (isSeeded || !organization) return;
    setPhone(organization.phone ?? '');
    setAddress(organization.address ?? '');
    setWeekendDays(organization.weekend_days ?? []);
    setIsSeeded(true);
  }, [organization, isSeeded]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateOrganizationPayload) => organizationApi.update(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['organization'], updated);
      Alert.alert('Saved', 'Organization settings have been updated.');
    },
    onError: (mutationError) => {
      Alert.alert('Failed to save', getApiErrorMessage(mutationError, 'Something went wrong. Please try again.'));
    },
  });

  const toggleWeekendDay = (dayIndex: number) => {
    setWeekendDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((day) => day !== dayIndex) : [...prev, dayIndex].sort((a, b) => a - b),
    );
  };

  const handleSave = () => {
    updateMutation.mutate({ phone, address, weekend_days: weekendDays });
  };

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Organization Settings</Text>
          <Text style={styles.subtitle}>Manage your organization's contact info and weekly schedule.</Text>
        </View>

        {isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load organization info.')}</Text>
        ) : organization ? (
          <View style={styles.card}>
            <View style={styles.identity}>
              <Text style={styles.orgName}>{organization.name}</Text>
              <Text style={styles.orgMeta}>{organization.email}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.form}>
              <TextField
                label="Phone"
                placeholder="e.g. +45 12 34 56 78"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                icon={<MaterialIcons name="phone" size={20} color={Colors.outline} />}
              />

              <TextField
                label="Address"
                placeholder="Street, city, postal code"
                value={address}
                onChangeText={setAddress}
                icon={<MaterialIcons name="location-on" size={20} color={Colors.outline} />}
              />

              <View style={styles.weekendSection}>
                <Text style={styles.fieldLabel}>Weekend Days</Text>
                <View style={styles.dayRow}>
                  {DAY_LABELS.map((label, index) => {
                    const selected = weekendDays.includes(index);
                    return (
                      <Pressable
                        key={label}
                        style={[styles.dayChip, selected && styles.dayChipSelected]}
                        onPress={() => toggleWeekendDay(index)}
                      >
                        <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <Button
              label="Save Changes"
              icon={<MaterialIcons name="save" size={18} color={Colors.onPrimary} />}
              loading={updateMutation.isPending}
              onPress={handleSave}
              permission={{ resource: Resources.ORGANIZATION, action: 'update' }}
            />
          </View>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.gutter,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.unit,
    marginBottom: Spacing.unit,
  },
  title: {
    ...Typography.headlineLgMobile,
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
  },
  identity: {
    gap: 2,
    marginBottom: Spacing.gutter,
  },
  orgName: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  orgMeta: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginBottom: Spacing.sectionGap,
  },
  form: {
    gap: Spacing.unit * 6,
    marginBottom: Spacing.sectionGap,
  },
  weekendSection: {
    gap: Spacing.unit * 3,
  },
  fieldLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.unit * 2,
  },
  dayChip: {
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  dayChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayChipText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  dayChipTextSelected: {
    color: Colors.onPrimary,
    fontFamily: 'Inter_600SemiBold',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  activeLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
});
