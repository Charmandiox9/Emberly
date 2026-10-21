import type { ReactElement } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './theme';

export type AppIconName =
  'add' | 'transfer' | 'category' | 'filter' | 'wallet' | 'history' | 'edit' | 'archive';

interface AppIconProps {
  readonly name: AppIconName;
  readonly color: string;
  readonly size?: number;
}

interface IconButtonProps {
  readonly icon: AppIconName;
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly primary?: boolean;
  readonly size?: number;
  readonly style?: StyleProp<ViewStyle>;
}

const paths: Readonly<Record<AppIconName, string>> = {
  add: 'M12 5v14M5 12h14',
  transfer: 'M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4',
  category: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  filter: 'M4 5h16l-6.5 7.5V19l-3 1v-7.5z',
  wallet:
    'M4 6h15a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12M16 13h5m-5 0a2 2 0 1 0 0 4h5v-4z',
  history: 'M3 12a9 9 0 1 0 2.6-6.4L3 8m0-5v5h5m4-1v5l3 2',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z',
  archive: 'M3 5h18v4H3zM5 9v11h14V9m-9 4h4',
};

export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  primary = false,
  size = 48,
  style,
}: IconButtonProps): ReactElement {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        style,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: primary ? theme.primary : theme.surface,
          borderColor: primary ? theme.primary : theme.border,
          opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <AppIcon name={icon} color={primary ? theme.onPrimary : theme.text} />
    </Pressable>
  );
}

export function AppIcon({ name, color, size = 24 }: AppIconProps): ReactElement {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
