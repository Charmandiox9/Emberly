import { Tabs } from 'expo-router';
import type { ReactElement } from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { typography, useTheme } from '../../shared/ui/theme';

interface TabIconProps {
  readonly color: ColorValue;
  readonly path: string;
}
function TabIcon({ color, path }: TabIconProps): ReactElement {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Path
        d={path}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
export default function TabLayout(): ReactElement {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.secondary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarLabelStyle: { fontFamily: typography.bold, fontSize: 12 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} path="M3 10 12 3l9 7v11h-6v-7H9v7H3Z" />
          ),
        }}
      />
      <Tabs.Screen
        name="movements"
        options={{
          title: 'Movimientos',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} path="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Estadísticas',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} path="M4 21V11h4v10m2 0V3h4v18m2 0V7h4v14" />
          ),
        }}
      />
    </Tabs>
  );
}
