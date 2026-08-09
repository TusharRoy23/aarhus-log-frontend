import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, DateTimeField, SelectField, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

// Sample data — there's no employees API yet.
const EMPLOYEE_OPTIONS = [
  { label: 'Sarah Jenkins', value: 'sarah-jenkins' },
  { label: 'Marcus King', value: 'marcus-king' },
  { label: 'David Chen', value: 'david-chen' },
];

const initialFormState = {
  startTime: '',
  endTime: '',
  employee: '',
  breakMinutes: '',
  notes: '',
};

type FormState = typeof initialFormState;

export function CreateShiftScreen() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => setForm(initialFormState);

  const handleSave = () => {
    // Alert's button onPress never fires on web (react-native-web's Alert.alert
    // is a no-op there) — don't gate navigation behind it.
    Alert.alert('Shift saved', "This is a UI preview — creating shifts isn't connected to a backend yet.");
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Create New Shift</Text>
            <Text style={styles.subtitle}>Schedule staffing requirements and employee assignments.</Text>
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
              value={form.employee}
              options={EMPLOYEE_OPTIONS}
              onChange={(value) => updateField('employee', value)}
            />

            <TextField
              label="Break Time"
              placeholder="e.g. 30"
              value={form.breakMinutes}
              onChangeText={(value) => updateField('breakMinutes', value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              icon={<MaterialIcons name="free-breakfast" size={20} color={Colors.outline} />}
              rightElement={<Text style={styles.unitLabel}>min</Text>}
            />

            <TextField
              label="Internal Notes (Optional)"
              placeholder="Add specific tasks or location details..."
              value={form.notes}
              onChangeText={(value) => updateField('notes', value)}
              multiline
              numberOfLines={4}
              style={styles.notesInput}
            />
          </View>

          <View style={styles.footer}>
            <Button label="Clear" variant="secondary" onPress={handleClear} style={styles.footerButton} />
            <Button
              label="Save"
              icon={<MaterialIcons name="save" size={18} color={Colors.onPrimary} />}
              onPress={handleSave}
              style={styles.footerButton}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  form: {
    gap: Spacing.unit * 6,
    marginBottom: Spacing.sectionGap,
  },
  unitLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  notesInput: {
    height: 96,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.gutter,
  },
  footerButton: {
    flex: 1,
  },
});
