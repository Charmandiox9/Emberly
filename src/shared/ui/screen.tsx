import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { typography, useTheme } from './theme';

interface ScreenProps {
  readonly title: string;
  readonly children: ReactNode;
}
export function Screen({ title, children }: ScreenProps): ReactElement {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.page, { backgroundColor: theme.background }]}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export const screenStyles = StyleSheet.create({
  section: { gap: 12 },
  card: { borderRadius: 20, padding: 20, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  body: { fontFamily: typography.regular, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: typography.regular, fontSize: 14, lineHeight: 20 },
  heading: { fontFamily: typography.bold, fontSize: 20, lineHeight: 28 },
});
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 20, paddingBottom: 32, gap: 24 },
  title: { fontFamily: typography.extraBold, fontSize: 28, lineHeight: 36 },
});
