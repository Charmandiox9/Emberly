import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, type ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { createExpoDatabase } from '../shared/storage/expo-database';
import { migrateDatabase } from '../shared/storage/migrations';
import { Button } from '../shared/ui/button';
import { useTheme } from '../shared/ui/theme';

async function initializeDatabase(database: SQLiteDatabase): Promise<void> {
  await migrateDatabase(createExpoDatabase(database));
}

function LoadingScreen(): ReactElement {
  const theme = useTheme();
  return (
    <View style={[styles.centered, { backgroundColor: theme.background }]}>
      <ActivityIndicator
        accessibilityLabel="Preparando Emberly"
        color={theme.primary}
        size="large"
      />
    </View>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps): ReactElement {
  const theme = useTheme();
  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          No pudimos abrir Emberly
        </Text>
        <Text style={[styles.description, { color: theme.secondary }]}>
          Tus datos no se han borrado. Intenta abrir la app de nuevo. Si actualizaste desde una
          versión más reciente, vuelve a instalar esa versión.
        </Text>
        <Button
          label="Reintentar"
          onPress={() => {
            void retry();
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function RootLayout(): ReactElement {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  if (fontError) throw fontError;
  if (!fontsLoaded) return <LoadingScreen />;
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Suspense fallback={<LoadingScreen />}>
          <SQLiteProvider databaseName="emberly.db" onInit={initializeDatabase} useSuspense>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.background },
              }}
            />
          </SQLiteProvider>
        </Suspense>
        <Toaster theme={colorScheme === 'dark' ? 'dark' : 'light'} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: { flex: 1, padding: 24, justifyContent: 'center', gap: 24 },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  description: { fontSize: 16, lineHeight: 24 },
});
