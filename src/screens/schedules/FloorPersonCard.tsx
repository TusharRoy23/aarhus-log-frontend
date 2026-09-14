import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

export interface FloorPersonCardProps {
  name: string;
  role: string;
  location: string;
  startedAtLabel: string;
  avatarUri?: string;
}

export function FloorPersonCard({ name, role, location, startedAtLabel, avatarUri }: FloorPersonCardProps) {
  const handleCall = () => Alert.alert('Call', 'Coming soon.');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Avatar label={name} uri={avatarUri} size={40} />
          <View style={styles.identityText}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.role}>{role}</Text>
          </View>
        </View>

        <Pressable style={styles.callButton} onPress={handleCall} hitSlop={8}>
          <MaterialIcons name="call" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.detailsList}>
        <View style={styles.row}>
          <MaterialIcons name="schedule" size={18} color={Colors.onSurface} />
          <Text style={styles.detailText}>{startedAtLabel}</Text>
        </View>
        <View style={styles.row}>
          <MaterialIcons name="location-on" size={18} color={Colors.onSurfaceVariant} />
          <Text style={styles.locationText}>{location}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.DEFAULT,
    padding: Spacing.cardPadding,
    gap: Spacing.gutter,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
    flexShrink: 1,
  },
  identityText: {
    flexShrink: 1,
  },
  name: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  role: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsList: {
    gap: Spacing.unit * 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  detailText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurface,
  },
  locationText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
});
