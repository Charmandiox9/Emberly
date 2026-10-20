import type { ReactElement } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from './button';
import { screenStyles } from './screen';
import { useTheme } from './theme';

interface ResourceFeedbackProps {
  readonly status: 'loading' | 'error';
  readonly retry: () => void;
}
export function ResourceFeedback({ status, retry }: ResourceFeedbackProps): ReactElement {
  const theme = useTheme();
  return status === 'loading' ? (
    <ActivityIndicator accessibilityLabel="Cargando datos" color={theme.primary} />
  ) : (
    <View style={screenStyles.section}>
      <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
        No pudimos leer los datos. Tus registros no se han borrado.
      </Text>
      <Button label="Reintentar" onPress={retry} />
    </View>
  );
}
