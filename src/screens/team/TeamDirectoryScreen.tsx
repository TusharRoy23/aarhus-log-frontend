import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, EmployeeCard, SearchField, type EmployeeCardAction } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { employeeApi, type Employee } from '../../lib/api/employee';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { EmployeeWagesModal } from './EmployeeWagesModal';

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

export function TeamDirectoryScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [wagesEmployee, setWagesEmployee] = useState<Employee | null>(null);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeApi.list,
  });
  const inviteMutation = useMutation({
    mutationFn: employeeApi.invite,
    onSuccess: (response) => {
      Alert.alert('Invite sent', response?.message ?? 'Invite sent successfully.');
    },
    onError: (error) => {
      Alert.alert('Error sending invite', getApiErrorMessage(error, 'Failed to send invite.'));
    }
  });

  const employees = data?.results ?? [];

  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return employees;
    return employees.filter((employee) => {
      const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
      return fullName.includes(normalized) || employee.designation.name.toLowerCase().includes(normalized);
    });
  }, [employees, query]);

  const handleResendInvite = (email: string) => {
    inviteMutation.mutate(email);
  };

  // EmployeeCard only reports which action was tapped — this screen decides
  // what each one means (route to push, mutation to run, etc.), so adding a
  // new card action never means adding a new prop to the card itself.
  const handleEmployeeAction = (action: EmployeeCardAction, employee: Employee) => {
    switch (action) {
      case 'edit':
        router.push({ pathname: '/employee-form', params: { id: employee.uuid } });
        break;
      case 'resend-invite':
        handleResendInvite(employee.email);
        break;
      case 'delete':
        notImplemented('Delete Employee');
        break;
      case 'manage-permissions':
        router.push({ pathname: '/employee-permissions', params: { uuid: employee.uuid } });
        break;
      case 'wages':
        setWagesEmployee(employee);
        break;
    }
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

        {isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load employees.')}</Text>
        ) : (
          <View style={styles.list}>
            {filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.uuid}
                name={`${employee.first_name} ${employee.last_name}`}
                email={employee.email}
                role={employee.designation.name}
                status={employee.is_active ? 'active' : 'inactive'}
                isInvited={employee.is_invited}
                onAction={(action) => handleEmployeeAction(action, employee)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <EmployeeWagesModal employee={wagesEmployee} onClose={() => setWagesEmployee(null)} />
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
