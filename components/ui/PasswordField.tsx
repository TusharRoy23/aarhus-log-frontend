import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { TextField, TextFieldProps } from './TextField';
import { Colors } from '../../theme/colors';

export interface PasswordFieldProps extends Omit<TextFieldProps, 'secureTextEntry'> {
  toggleable?: boolean;
}

export function PasswordField({ icon, toggleable = true, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      icon={icon ?? <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.outline} />}
      secureTextEntry={!visible}
      autoCapitalize="none"
      rightElement={
        toggleable ? (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
            <MaterialIcons
              name={visible ? 'visibility-off' : 'visibility'}
              size={20}
              color={Colors.outline}
            />
          </Pressable>
        ) : undefined
      }
    />
  );
}
