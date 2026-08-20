import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, Checkbox } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { designationApi } from '../../lib/api/designation';
import { designationPermissionApi, type DesignationPermissionsResponse, type PermissionModel } from '../../lib/api/permission';
import { getApiErrorMessage } from '../../lib/api/base_api';

// Friendly section titles for known resources — falls back to a capitalized
// `model` string for anything not in this map, since the backend can add new
// permission categories without a frontend change (same reasoning as
// `Permissions` being a `Record`, not a fixed set of keys, in permission.ts).
const MODEL_LABELS: Record<string, string> = {
  designation: 'Designations',
  employee: 'Employees',
  schedule: 'Schedules',
  worklocation: 'Work Locations',
  organization: 'Organization',
};

function modelLabel(model: string): string {
  return MODEL_LABELS[model] ?? model.charAt(0).toUpperCase() + model.slice(1);
}

function actionLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function selectedCodesFrom(results: PermissionModel[]): Set<string> {
  const codes = new Set<string>();
  for (const model of results) {
    for (const action of model.actions) {
      if (action.is_selected) codes.add(action.code);
    }
  }
  return codes;
}

export function DesignationPermissionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Same cache the Designations list already populated — read the name from
  // it rather than issuing a second request just for that.
  const { data: designationsData } = useQuery({ queryKey: ['designations'], queryFn: designationApi.list });
  const designationName = designationsData?.results.find((d) => d.uuid === id)?.name;

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['designation-permissions', id],
    queryFn: () => designationPermissionApi.get(id),
    enabled: !!id,
  });

  // Seeded once the matrix loads, same "gate behind a spinner until the
  // record is in, no re-sync-to-changing-props" approach CreateShiftScreen
  // uses for its own edit flow.
  const [selectedCodes, setSelectedCodes] = useState<Set<string> | null>(null);
  const matrix = data?.results ?? [];
  if (data && selectedCodes === null) {
    setSelectedCodes(selectedCodesFrom(data.results));
  }

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const updateMutation = useMutation({
    mutationFn: () => designationPermissionApi.update(id, { permissions: Array.from(selectedCodes ?? []) }),
    onSuccess: () => {
      // Unlike designationApi.update/scheduleApi.update, this endpoint's
      // response is just a plain confirmation string, not the updated
      // record — so there's nothing to hand `setQueryData` from the
      // response itself. But we already know exactly what the new state is
      // (it's what we just sent), so rebuild the cached `results` by
      // re-flagging `is_selected` from `selectedCodes` and write that in
      // directly. Without this, reopening the same designation's
      // permissions right after save would show the stale pre-save state
      // until this query's staleTime happened to expire — same class of
      // bug as the schedule edit screen's ['schedule', uuid] cache fix.
      if (selectedCodes) {
        queryClient.setQueryData<DesignationPermissionsResponse>(['designation-permissions', id], (old) =>
          old
            ? {
                ...old,
                results: old.results.map((model) => ({
                  ...model,
                  actions: model.actions.map((action) => ({
                    ...action,
                    is_selected: selectedCodes.has(action.code),
                  })),
                })),
              }
            : old,
        );
      }
      router.back();
    },
  });

  return (
    <AppShell hideBottomNav>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Manage Permissions</Text>
            <Text style={styles.subtitle}>
              {designationName ? `Choose what the ${designationName} role can do.` : 'Choose what this role can do.'}
            </Text>
          </View>

          <View style={styles.divider} />

          {isPending || selectedCodes === null ? (
            <ActivityIndicator color={Colors.primary} style={styles.loading} />
          ) : isError ? (
            <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load permissions.')}</Text>
          ) : (
            <>
              <View style={styles.matrix}>
                {matrix.map((model) => (
                  <View key={model.model} style={styles.section}>
                    <Text style={styles.sectionTitle}>{modelLabel(model.model)}</Text>
                    <View style={styles.actionRow}>
                      {model.actions.map((action) => (
                        <Pressable
                          key={action.code}
                          style={styles.actionItem}
                          onPress={() => toggleCode(action.code)}
                        >
                          <Checkbox checked={selectedCodes.has(action.code)} onChange={() => toggleCode(action.code)} />
                          <Text style={styles.actionLabel}>{actionLabel(action.name)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {updateMutation.isError ? (
                <Text style={styles.errorText}>{getApiErrorMessage(updateMutation.error, 'Failed to save permissions.')}</Text>
              ) : null}

              <Button
                label="Save Changes"
                icon={<MaterialIcons name="save" size={18} color={Colors.onPrimary} />}
                loading={updateMutation.isPending}
                onPress={() => updateMutation.mutate()}
              />
            </>
          )}
        </View>
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
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
  },
  header: {
    gap: Spacing.unit,
    marginBottom: Spacing.gutter,
  },
  title: {
    ...Typography.headlineLgMobile,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginBottom: Spacing.sectionGap,
  },
  loading: {
    marginVertical: Spacing.sectionGap,
  },
  matrix: {
    gap: Spacing.sectionGap,
    marginBottom: Spacing.sectionGap,
  },
  section: {
    gap: Spacing.unit * 3,
  },
  sectionTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.gutter,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    minWidth: 100,
  },
  actionLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
    marginBottom: Spacing.unit * 3,
  },
});
