import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Checkbox } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import {
  organizationApi,
  type Rule,
  type RuleSection,
  type RuleSectionUpdatePayload,
  type RuleUpdatePayload,
} from '../../lib/api/organization';
import { getApiErrorMessage } from '../../lib/api/base_api';

// Walks every section's rule tree (rules + sub_rules, uuid is assumed unique
// across the whole tree) and replaces the one matching `uuid`. Used for
// every field edit on this screen instead of separate per-field setters.
function updateRuleInSections(sections: RuleSection[], uuid: string, updater: (rule: Rule) => Rule): RuleSection[] {
  const mapRules = (rules: Rule[]): Rule[] =>
    rules.map((rule) => {
      if (rule.uuid === uuid) return updater(rule);
      if (rule.sub_rules?.length) return { ...rule, sub_rules: mapRules(rule.sub_rules) };
      return rule;
    });
  return sections.map((section) => ({ ...section, rules: mapRules(section.rules) }));
}

// De-selecting a rule (or its whole section) also de-selects every rule
// beneath it, and locks them: a sub-rule can only be toggled while its
// parent rule is checked, and a rule can only be toggled while its section
// is checked. Re-enabling a parent doesn't restore what was underneath — it
// just unlocks those rows for the admin to check again by hand.
function deactivateSubtree(rule: Rule): Rule {
  return { ...rule, is_active: false, sub_rules: rule.sub_rules?.map(deactivateSubtree) };
}

// Trims each rule down to the save endpoint's slim shape — only the value
// field matching its own input_type is sent, mirroring the dummy payload
// this was built against.
function toRuleUpdatePayload(rule: Rule): RuleUpdatePayload {
  const payload: RuleUpdatePayload = {
    uuid: rule.uuid,
    is_active: rule.is_active,
    input_type: rule.input_type,
  };
  if (rule.input_type === 'number' && rule.number_value != null) payload.number_value = rule.number_value;
  if (rule.input_type === 'options' && rule.selected_options) payload.selected_options = [rule.selected_options];
  if (rule.input_type === 'text' && rule.text_value != null) payload.text_value = rule.text_value;
  if (rule.sub_rules?.length) payload.sub_rules = rule.sub_rules.map(toRuleUpdatePayload);
  return payload;
}

function toSectionsUpdatePayload(sections: RuleSection[]): RuleSectionUpdatePayload[] {
  return sections.map((section) => ({
    uuid: section.uuid,
    is_active: section.is_active,
    rules: section.rules.map(toRuleUpdatePayload),
  }));
}

interface RuleValueFieldProps {
  rule: Rule;
  /** Whether the chain above this row (section + every ancestor rule) is
   * checked, AND this row's own checkbox is checked — the field can only
   * be edited when both hold. */
  enabled: boolean;
  onNumberChange: (text: string) => void;
  onTextChange: (text: string) => void;
  onSelectOption: (option: string) => void;
}

// The input shown to the right of a rule's label — shape depends on
// input_type. Plain TextInput rather than this app's TextField/SelectField,
// since those always render their own label above the field; here the
// rule's own label already sits to the left and the field just needs to be
// a compact box, not a full labeled form row.
function RuleValueField({ rule, enabled, onNumberChange, onTextChange, onSelectOption }: RuleValueFieldProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);

  if (rule.input_type === 'number') {
    return (
      <TextInput
        style={[styles.inlineInput, styles.numberInput, !enabled && styles.inlineInputDisabled]}
        value={rule.number_value != null ? String(rule.number_value) : ''}
        onChangeText={onNumberChange}
        keyboardType="decimal-pad"
        editable={enabled}
        placeholder="0"
        placeholderTextColor={Colors.outline}
      />
    );
  }

  if (rule.input_type === 'options') {
    const options = rule.options ?? [];
    return (
      <>
        <Pressable
          style={[styles.inlineInput, styles.optionTrigger, !enabled && styles.inlineInputDisabled]}
          onPress={() => enabled && setOptionsOpen(true)}
          disabled={!enabled}
        >
          <Text style={[styles.optionTriggerText, !rule.selected_options && styles.optionTriggerPlaceholder]} numberOfLines={1}>
            {rule.selected_options ?? 'Select'}
          </Text>
          <MaterialIcons name="expand-more" size={18} color={Colors.outline} />
        </Pressable>

        <Modal visible={optionsOpen} transparent animationType="fade" onRequestClose={() => setOptionsOpen(false)}>
          <View style={styles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOptionsOpen(false)} accessibilityLabel="Close" />
            <View style={styles.sheet}>
              {options.map((option) => (
                <Pressable
                  key={option}
                  style={styles.optionRow}
                  onPress={() => {
                    onSelectOption(option);
                    setOptionsOpen(false);
                  }}
                >
                  <Text style={styles.optionRowText}>{option}</Text>
                  {option === rule.selected_options ? (
                    <MaterialIcons name="check" size={18} color={Colors.primary} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <TextInput
      style={[styles.inlineInput, styles.textInput, !enabled && styles.inlineInputDisabled]}
      value={rule.text_value ?? ''}
      onChangeText={onTextChange}
      editable={enabled}
      placeholder="Value"
      placeholderTextColor={Colors.outline}
    />
  );
}

interface RuleRowProps {
  rule: Rule;
  depth: number;
  /** Whether every ancestor (section + every parent rule up the chain) is
   * checked — this row's own checkbox can only be toggled while true. */
  ancestorsActive: boolean;
  onToggle: (uuid: string) => void;
  onNumberChange: (uuid: string, text: string) => void;
  onTextChange: (uuid: string, text: string) => void;
  onSelectOption: (uuid: string, option: string) => void;
}

function RuleRow({ rule, depth, ancestorsActive, onToggle, onNumberChange, onTextChange, onSelectOption }: RuleRowProps) {
  const enabled = ancestorsActive && rule.is_active;
  return (
    <View>
      <View style={[styles.ruleRow, depth > 0 && { marginLeft: Spacing.gutter * depth }]}>
        <Checkbox checked={rule.is_active} onChange={() => onToggle(rule.uuid)} disabled={!ancestorsActive} />
        <Text style={[styles.ruleLabel, !enabled && styles.ruleLabelDisabled]}>{rule.label}</Text>
        <RuleValueField
          rule={rule}
          enabled={enabled}
          onNumberChange={(text) => onNumberChange(rule.uuid, text)}
          onTextChange={(text) => onTextChange(rule.uuid, text)}
          onSelectOption={(option) => onSelectOption(rule.uuid, option)}
        />
      </View>
      {rule.sub_rules?.map((subRule) => (
        <RuleRow
          key={subRule.uuid}
          rule={subRule}
          depth={depth + 1}
          ancestorsActive={enabled}
          onToggle={onToggle}
          onNumberChange={onNumberChange}
          onTextChange={onTextChange}
          onSelectOption={onSelectOption}
        />
      ))}
    </View>
  );
}

// The "Rules" tab on Organization Settings — each rule section renders as
// its own card (table), with every rule (and nested sub-rule, indented)
// shown as a checkbox + label + value-input row regardless of its is_active
// state, so the admin can see and toggle everything from one screen rather
// than only already-enabled rules.
export function RulesTab() {
  const queryClient = useQueryClient();
  const { data: ruleSections, isPending, isError, error } = useQuery({
    queryKey: ['rule-sections'],
    queryFn: organizationApi.getRules,
  });

  const [sections, setSections] = useState<RuleSection[]>([]);
  const [errorModal, setErrorModal] = useState<string | undefined>();

  useEffect(() => {
    if (ruleSections) setSections(ruleSections.results);
  }, [ruleSections]);

  const updateMutation = useMutation({
    mutationFn: (payload: RuleSectionUpdatePayload[]) => organizationApi.updateRules({ sections: payload }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rule-sections'] });
      Alert.alert('Saved', data.message ?? 'Changes saved successfully.');
    },
    onError: (mutationError) => setErrorModal(getApiErrorMessage(mutationError, 'Something went wrong. Please try again.')),
  });

  const toggleSection = (uuid: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.uuid !== uuid) return section;
        const nextActive = !section.is_active;
        return { ...section, is_active: nextActive, rules: nextActive ? section.rules : section.rules.map(deactivateSubtree) };
      }),
    );
  };

  const toggleRule = (uuid: string) => {
    setSections((prev) =>
      updateRuleInSections(prev, uuid, (rule) => (rule.is_active ? deactivateSubtree(rule) : { ...rule, is_active: true })),
    );
  };

  const setNumberValue = (uuid: string, text: string) => {
    const sanitized = text.replace(/[^0-9.]/g, '');
    const numeric = sanitized === '' ? null : Number(sanitized);
    setSections((prev) =>
      updateRuleInSections(prev, uuid, (rule) => ({
        ...rule,
        number_value: numeric === null || Number.isNaN(numeric) ? rule.number_value : numeric,
      })),
    );
  };

  const setTextValue = (uuid: string, text: string) => {
    setSections((prev) => updateRuleInSections(prev, uuid, (rule) => ({ ...rule, text_value: text })));
  };

  const setSelectedOption = (uuid: string, option: string) => {
    setSections((prev) => updateRuleInSections(prev, uuid, (rule) => ({ ...rule, selected_options: option })));
  };

  const handleSave = () => updateMutation.mutate(toSectionsUpdatePayload(sections));

  if (isPending) {
    return <ActivityIndicator color={Colors.primary} style={styles.loading} />;
  }
  if (isError) {
    return <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load rules.')}</Text>;
  }

  return (
    <View style={styles.container}>
      {sections.map((section) => (
        <View key={section.uuid} style={styles.card}>
          <View style={styles.sectionHeader}>
            <Checkbox checked={section.is_active} onChange={() => toggleSection(section.uuid)} />
            <Text style={[styles.sectionTitle, !section.is_active && styles.ruleLabelDisabled]}>{section.label}</Text>
          </View>
          <View style={styles.sectionBody}>
            {section.rules.map((rule) => (
              <RuleRow
                key={rule.uuid}
                rule={rule}
                depth={0}
                ancestorsActive={section.is_active}
                onToggle={toggleRule}
                onNumberChange={setNumberValue}
                onTextChange={setTextValue}
                onSelectOption={setSelectedOption}
              />
            ))}
          </View>
        </View>
      ))}

      <Button label="Save Changes" onPress={handleSave} loading={updateMutation.isPending} />

      <Modal visible={!!errorModal} transparent animationType="fade" onRequestClose={() => setErrorModal(undefined)}>
        <View style={styles.overlay}>
          <View style={styles.errorSheet}>
            <Text style={styles.sectionTitle}>Failed to save</Text>
            <Text style={styles.errorText}>{errorModal}</Text>
            <Button label="OK" onPress={() => setErrorModal(undefined)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  container: {
    gap: Spacing.gutter,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.gutter,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.unit * 2,
  },
  sectionTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  sectionBody: {
    gap: Spacing.unit * 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.unit * 2,
  },
  ruleLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
    flex: 1,
  },
  ruleLabelDisabled: {
    color: Colors.onSurfaceVariant,
  },
  inlineInput: {
    ...Typography.bodyMd,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.unit * 2,
    paddingHorizontal: Spacing.unit * 3,
    color: Colors.onSurface,
  },
  inlineInputDisabled: {
    backgroundColor: Colors.surfaceContainerLow,
    color: Colors.onSurfaceVariant,
  },
  numberInput: {
    width: 80,
    textAlign: 'right',
  },
  textInput: {
    width: 160,
  },
  optionTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit,
    width: 160,
  },
  optionTriggerText: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
    flex: 1,
  },
  optionTriggerPlaceholder: {
    color: Colors.outline,
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
    maxHeight: '60%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.unit * 2,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingVertical: Spacing.unit * 4,
  },
  optionRowText: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
    flex: 1,
  },
  errorSheet: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.gutter,
  },
});
