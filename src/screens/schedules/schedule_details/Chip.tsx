import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { Spacing } from '../../../theme/spacing';
import { Radius } from '../../../theme/radius';

// Same accent used elsewhere for a "positive" tone (Toast's success variant,
// DesignationCard's active strip) — this app has no dedicated success color
// token yet.
const SUCCESS_COLOR = '#10b981';

export interface ChipProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  tone?: 'neutral' | 'success';
}

export function Chip({ icon, label, tone = 'neutral' }: ChipProps) {
  const isSuccess = tone === 'success';
  return (
    <View style={[styles.chip, isSuccess && styles.chipSuccess]}>
      <MaterialIcons name={icon} size={16} color={isSuccess ? SUCCESS_COLOR : Colors.onSurfaceVariant} />
      <Text style={[styles.label, isSuccess && styles.labelSuccess]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.unit * 3,
    paddingVertical: Spacing.unit * 2,
    borderRadius: Radius.full,
  },
  chipSuccess: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  label: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  labelSuccess: {
    color: SUCCESS_COLOR,
  },
});
