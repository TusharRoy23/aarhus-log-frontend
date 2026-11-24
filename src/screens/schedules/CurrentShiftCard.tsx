import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { Colors } from '../../theme/colors';
import type { ActiveScheduleResponse, Schedule } from '../../lib/api/schedule';

export type CurrentShiftCardProps =
  | {
    mode: 'in-progress';
    active: ActiveScheduleResponse;
    onEnd: () => void;
    isEnding: boolean;
  }
  | {
    mode: 'starting-soon';
    shift: Schedule;
    onStart: () => void;
    isStarting: boolean;
  };

// Just the Start/End Shift action — the location/time/countdown display
// this used to carry moved to NextShiftCard; this component's only
// remaining job (on the schedule-detail screen) is the action button
// itself.
export function CurrentShiftCard(props: CurrentShiftCardProps) {
  if (props.mode === 'in-progress') {
    return (
      <Button
        label="End Schedule"
        variant="destructive"
        icon={<MaterialIcons name="stop-circle" size={20} color={Colors.onError} />}
        onPress={props.onEnd}
        loading={props.isEnding}
      />
    );
  }
  return (
    <Button
      label="Start Shift"
      variant="primary"
      icon={<MaterialIcons name="play-circle" size={20} color={Colors.onPrimary} />}
      onPress={props.onStart}
      loading={props.isStarting}
    />
  );
}
