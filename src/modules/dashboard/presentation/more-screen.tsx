import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { typography, useTheme } from '../../../shared/ui/theme';

export interface MoreScreenProps {
  readonly onAccounts: () => void;
  readonly onCategories: () => void;
  readonly onBudgets: () => void;
  readonly onSettings: () => void;
}

interface MenuItemProps {
  readonly title: string;
  readonly description: string;
  readonly onPress: () => void;
}

export function MoreScreen({
  onAccounts,
  onCategories,
  onBudgets,
  onSettings,
}: MoreScreenProps): ReactElement {
  const theme = useTheme();
  return (
    <Screen title="Más">
      <Text style={[screenStyles.body, { color: theme.secondary }]}>
        Administra tus cuentas y preferencias.
      </Text>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
          Organización
        </Text>
        <MenuItem
          title="Cuentas"
          description="Saldos, cuentas activas y archivadas"
          onPress={onAccounts}
        />
        <MenuItem
          title="Categorías"
          description="Organiza tus ingresos y gastos"
          onPress={onCategories}
        />
        <MenuItem
          title="Presupuestos"
          description="Define límites mensuales por categoría"
          onPress={onBudgets}
        />
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
          Preferencias y datos
        </Text>
        <MenuItem
          title="Ajustes, recordatorios y respaldo"
          description="Configura avisos y protege tus datos locales"
          onPress={onSettings}
        />
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
