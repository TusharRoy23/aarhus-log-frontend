import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, DateTimeField, SelectField, TextField, type SelectFieldOption } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

export type CreateShiftFormValues = {
  startTime: string;
  endTime: string;
  employeeUuid: string;
  workLocationUuid: string;
  breakMinutes: string;
};

const initialFormState: CreateShiftFormValues = {
  startTime: '',
  endTime: '',
  employeeUuid: '',
  workLocationUuid: '',
  breakMinutes: '',
};

export interface CreateShiftFormProps {
  employeeOptions: SelectFieldOption[];
  workLocationOptions: SelectFieldOption[];
  isEmployeesLoading: boolean;
  isWorkLocationsLoading: boolean;
  isSubmitting: boolean;
  errorMessage?: string;
  /**
   * When present, the form opens pre-filled for editing that shift instead
   * of creating a new one. `CreateShiftScreen` only mounts this component
   * once the existing record has loaded (rather than passing it in
   * asynchronously), so `initialValues` is always ready by first render —
   * no need to re-sync local state to a prop that changes after mount.
   */
  initialValues?: CreateShiftFormValues;
  onSubmit: (values: CreateShiftFormValues) => void;
}

// Pure form UI — all API/mutation concerns (fetching employees/work
// locations, submitting, cache writes, navigation) stay in
// CreateShiftScreen, which owns this component and passes the fetched
// option lists down as props. This component only owns the local field
// state and client-side validation. The form renders immediately rather
// than waiting on its parent's queries — each SelectField shows its own
// pulsing skeleton while `isEmployeesLoading`/`isWorkLocationsLoading` is
// true, so nothing pops in once the data resolves.
export function CreateShiftForm({
  employeeOptions,
  workLocationOptions,
  isEmployeesLoading,
  isWorkLocationsLoading,
  isSubmitting,
  errorMessage,
  initialValues,
  onSubmit,
}: CreateShiftFormProps) {
  const isEditing = Boolean(initialValues);
  const [form, setForm] = useState<CreateShiftFormValues>(initialValues ?? initialFormState);
  const [validationError, setValidationError] = useState<string | undefined>();

  const updateField = <K extends keyof CreateShiftFormValues>(key: K, value: CreateShiftFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => setForm(initialValues ?? initialFormState);

  const handleSave = () => {
    if (!form.startTime || !form.endTime || !form.employeeUuid) {
      setValidationError('Please fill in start time, end time, and employee assignment.');
      return;
    }
    setValidationError(undefined);
    onSubmit(form);
  };

  const combinedError = validationError ?? errorMessage;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{isEditing ? 'Edit Shift' : 'Create New Shift'}</Text>
        <Text style={styles.subtitle}>
          {isEditing
            ? "Update this shift's details."
            : 'Schedule staffing requirements and employee assignments.'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.form}>
        <DateTimeField
          label="Start Time"
          mode="datetime"
          value={form.startTime}
          onChange={(value) => updateField('startTime', value)}
        />

        <DateTimeField
          label="End Time"
          mode="datetime"
          value={form.endTime}
          onChange={(value) => updateField('endTime', value)}
        />

        <SelectField
          label="Employee Assignment"
          placeholder="Select Employee"
          value={form.employeeUuid}
          options={employeeOptions}
          onChange={(value) => updateField('employeeUuid', value)}
          loading={isEmployeesLoading}
        />

        {isWorkLocationsLoading ? (
          <SelectField
            label="Work Location"
            placeholder="Select Location"
            value={form.workLocationUuid}
            options={workLocationOptions}
            onChange={(value) => updateField('workLocationUuid', value)}
            icon={<MaterialIcons name="location-on" size={20} color={Colors.outline} />}
            loading
          />
        ) : workLocationOptions.length > 0 ? (
          <SelectField
            label="Work Location"
            placeholder="Select Location"
            value={form.workLocationUuid}
            options={workLocationOptions}
            onChange={(value) => updateField('workLocationUuid', value)}
            icon={<MaterialIcons name="location-on" size={20} color={Colors.outline} />}
          />
        ) : null}

        <TextField
          label="Break Time"
          placeholder="e.g. 30"
          value={form.breakMinutes}
          onChangeText={(value) => updateField('breakMinutes', value.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          icon={<MaterialIcons name="free-breakfast" size={20} color={Colors.outline} />}
          rightElement={<Text style={styles.unitLabel}>min</Text>}
        />

        {combinedError ? <Text style={styles.errorText}>{combinedError}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Button label="Clear" variant="secondary" onPress={handleClear} style={styles.footerButton} />
        <Button
          label='Save'
          icon={<MaterialIcons name="save" size={18} color={Colors.onPrimary} />}
          loading={isSubmitting}
          onPress={handleSave}
          style={styles.footerButton}
        />
      </View>
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
  form: {
    gap: Spacing.unit * 6,
    marginBottom: Spacing.sectionGap,
  },
  unitLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.gutter,
  },
  footerButton: {
    flex: 1,
  },
});
