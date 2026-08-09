import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, EmployeeCard, SearchField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { useAppSelector } from '../../store/hooks';

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

export function TeamDirectoryScreen() {
  const router = useRouter();
  const employees = useAppSelector((state) => state.employees.items);
  const [query, setQuery] = useState('');

  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return employees;
    return employees.filter((employee) => {
      const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
      return (
        fullName.includes(normalized) ||
        employee.role.toLowerCase().includes(normalized) ||
        (employee.department ?? '').toLowerCase().includes(normalized)
      );
    });
  }, [employees, query]);

  const handleResendInvite = (name: string) => {
    Alert.alert('Invite resent', `A new invite email has been sent to ${name}.`);
  };

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Team Directory</Text>
          <Text style={styles.subtitle}>Manage employees and their access.</Text>
        </View>

        <SearchField
          placeholder="Search employees, roles, or departments..."
          value={query}
          onChangeText={setQuery}
        />

        <Button
          label="Add Employee"
          icon={<MaterialIcons name="add" size={20} color={Colors.onPrimary} />}
          onPress={() => router.push('/employee-form')}
        />

        <View style={styles.list}>
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              name={`${employee.firstName} ${employee.lastName}`}
              role={employee.role}
              status={employee.status}
              onEdit={() => router.push({ pathname: '/employee-form', params: { id: employee.id } })}
              onResendInvite={() => handleResendInvite(`${employee.firstName} ${employee.lastName}`)}
              onMore={() => notImplemented('More options')}
            />
          ))}
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
});
