import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useEffect, useState, type ReactElement } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import { ServicesProvider } from '../application/services';
import { createAttachmentService } from '../application/attachment-services';
import { PrivacyProvider } from '../shared/ui/amount';
import { ReminderLifecycle } from '../application/reminder-lifecycle';
import { ExpoBackupFiles } from '../modules/backup/infrastructure/expo-backup-files';

import { createExpoDatabase } from '../shared/storage/expo-database';
import { migrateDatabase } from '../shared/storage/migrations';
import { Button } from '../shared/ui/button';
import { useTheme } from '../shared/ui/theme';
import emberImage from '../../assets/ember/ember-companion.png';

function StartupWelcome(): ReactElement | null {
  const theme = useTheme();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(timeout);
  }, []);
  return (
    <>
      {visible ? (
        <Animated.View
          entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(180).reduceMotion(ReduceMotion.System)}
          style={[styles.welcome, { backgroundColor: theme.background }]}
        >
          <Animated.View
            entering={FadeIn.duration(260).delay(80).reduceMotion(ReduceMotion.System)}
            style={styles.welcomeContent}
          >
            <Image
              source={emberImage}
              resizeMode="contain"
              style={styles.welcomeEmber}
              accessibilityLabel="Ember, la mascota de Emberly"
            />
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>¡Bienvenido a Emberly!</Text>
            <Text style={[styles.welcomeSubtitle, { color: theme.secondary }]}>
              Pequeños hábitos, grandes fuegos
            </Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </>
  );
}

async function initializeDatabase(database: SQLiteDatabase): Promise<void> {
  const adapter = createExpoDatabase(database);
  await migrateDatabase(adapter);
  const attachments = [
    ...(await adapter.all("SELECT id, sha256 FROM attachments WHERE state = 'ready'")),
    ...(await adapter.all('SELECT image_id AS id, sha256 FROM goal_images')),
  ];
  await new ExpoBackupFiles().recoverAttachments(
    attachments.map((row) => {
      if (typeof row['id'] !== 'string' || typeof row['sha256'] !== 'string')
        throw new Error('Los comprobantes guardados no son válidos.');
      return { id: row['id'], sha256: row['sha256'] };
    }),
  );
  await createAttachmentService(adapter).recover();
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
            <ServicesProvider>
              <PrivacyProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.background },
                  }}
                >
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen
                    name="settings"
                    options={{
                      headerShown: true,
                      title: 'Ajustes',
                      headerTintColor: theme.text,
                      headerStyle: { backgroundColor: theme.background },
                    }}
                  />
                  <Stack.Screen
                    name="goal-activity"
                    options={{
                      headerShown: true,
                      title: 'Aportes y retiros',
                      headerTintColor: theme.text,
                      headerStyle: { backgroundColor: theme.background },
                    }}
                  />
                  <Stack.Screen
                    name="budgets"
                    options={{
                      headerShown: true,
                      title: 'Presupuestos',
                      headerTintColor: theme.text,
                      headerStyle: { backgroundColor: theme.background },
                    }}
                  />
                  <Stack.Screen
                    name="categories"
                    options={{
                      headerShown: true,
                      title: 'Categorías',
                      headerTintColor: theme.text,
                      headerStyle: { backgroundColor: theme.background },
                    }}
                  />
                  <Stack.Screen
                    name="transfers"
                    options={{
                      headerShown: true,
                      title: 'Transferencias',
                      headerTintColor: theme.text,
                      headerStyle: { backgroundColor: theme.background },
                    }}
                  />
                  <Stack.Screen
                    name="movement"
                    options={{
                      headerShown: true,
                      title: 'Movimiento',
                      headerTintColor: theme.text,
                      headerStyle: { backgroundColor: theme.background },
                    }}
                  />
                </Stack>
                <StartupWelcome />
                <ReminderLifecycle />
              </PrivacyProvider>
            </ServicesProvider>
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
  welcome: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  welcomeContent: { alignItems: 'center', gap: 10 },
  welcomeEmber: { width: 190, height: 190 },
  welcomeTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
