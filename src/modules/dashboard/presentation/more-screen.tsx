import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { typography, useTheme } from '../../../shared/ui/theme';

export interface MoreScreenProps {
  readonly onBudgets: () => void;
  readonly onSettings: () => void;
  readonly onStatistics: () => void;
}

interface MenuItemProps {
  readonly title: string;
  readonly description: string;
  readonly onPress: () => void;
}

export function MoreScreen({ onBudgets, onSettings, onStatistics }: MoreScreenProps): ReactElement {
  const theme = useTheme();
  return (
    <Screen title="Más">
      <View style={[styles.profile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <Text style={[styles.avatarText, { color: theme.onPrimary }]}>E</Text>
        </View>
        <View style={styles.itemText}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>Tu perfil Emberly</Text>
          <Text style={[screenStyles.caption, { color: theme.secondary }]}>
            Perfil local · sincronización con Google próximamente
          </Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
          Finanzas y progreso
        </Text>
        <MenuItem
          title="Estadísticas detalladas"
          description="Revisa ingresos, gastos y tendencias por periodo"
          onPress={onStatistics}
        />
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
          Organización
        </Text>
        <MenuItem
          title="Presupuestos"
          description="Define límites mensuales por categoría"
          onPress={onBudgets}
        />
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
          Cuenta y aplicación
        </Text>
        <MenuItem
          title="Ajustes, recordatorios y respaldo"
          description="Configura avisos y protege tus datos locales"
          onPress={onSettings}
        />
        <Text style={[screenStyles.caption, { color: theme.secondary }]}>
          El inicio de sesión con Google y el cierre de sesión estarán disponibles al completar la
          autenticación.
        </Text>
      </View>
    </Screen>
  );
}

function MenuItem({ title, description, onPress }: MenuItemProps): ReactElement {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={styles.itemText}>
        <Text style={[styles.itemTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[screenStyles.caption, { color: theme.secondary }]}>{description}</Text>
      </View>
      <Text accessibilityElementsHidden style={[styles.chevron, { color: theme.secondary }]}>
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profile: {
    minHeight: 88,
    padding: 16,
    borderWidth: 1,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: typography.extraBold, fontSize: 24 },
  section: { gap: 10 },
  item: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: { flex: 1, gap: 2 },
  itemTitle: { fontFamily: typography.bold, fontSize: 16, lineHeight: 24 },
  chevron: { fontFamily: typography.regular, fontSize: 28, lineHeight: 32 },
});
