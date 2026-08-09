import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, DesignationCard, SearchField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { designationApi } from '../../lib/api/designation';
import { getApiErrorMessage } from '../../lib/api/base_api';

export function DesignationsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['designations'],
    queryFn: designationApi.list,
  });

  const designations = data?.results ?? [];

  const filteredDesignations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return designations;
    return designations.filter((designation) => designation.name.toLowerCase().includes(normalized));
  }, [designations, query]);

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Designations</Text>
          <Text style={styles.subtitle}>Manage the roles employees can be assigned.</Text>
        </View>

        <SearchField placeholder="Search designations..." value={query} onChangeText={setQuery} />

        <Button
          label="Add Designation"
          icon={<MaterialIcons name="add" size={20} color={Colors.onPrimary} />}
          onPress={() => router.push('/designation-form')}
        />

        {isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load designations.')}</Text>
        ) : (
          <View style={styles.list}>
            {filteredDesignations.map((designation) => (
              <DesignationCard
                key={designation.uuid}
                name={designation.name}
                isActive={designation.is_active}
                isOwner={designation.is_owner}
                onEdit={() => router.push({ pathname: '/designation-form', params: { id: designation.uuid } })}
              />
            ))}
          </View>
        )}
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
  list: {
    gap: Spacing.gutter,
    marginTop: Spacing.unit,
  },
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
});
