import { createContext, useContext, useState, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { formatMoney, type Money } from '../domain/money';
import { typography, useTheme } from './theme';

interface Privacy {
  readonly hidden: boolean;
  readonly toggle: () => void;
}
interface PrivacyProviderProps {
  readonly children: ReactNode;
}
interface AmountProps {
  readonly value: Money;
  readonly large?: boolean;
  readonly prefix?: string;
}
const PrivacyContext = createContext<Privacy | null>(null);
export function PrivacyProvider({ children }: PrivacyProviderProps): ReactElement {
  const [hidden, setHidden] = useState(false);
  return (
    <PrivacyContext.Provider value={{ hidden, toggle: () => setHidden((value) => !value) }}>
      {children}
    </PrivacyContext.Provider>
  );
}
export function usePrivacy(): Privacy {
  const privacy = useContext(PrivacyContext);
  if (!privacy) throw new Error('Falta el proveedor de privacidad.');
  return privacy;
}
export function Amount({ value, large = false, prefix = '' }: AmountProps): ReactElement {
  const theme = useTheme();
  const { hidden } = usePrivacy();
  return (
    <Text
      accessibilityLabel={hidden ? 'Monto oculto' : `${prefix}${formatMoney(value)}`}
      style={[large ? styles.large : styles.amount, { color: theme.text }]}
    >
      {hidden ? '••••••' : `${prefix}${formatMoney(value)}`}
    </Text>
  );
}
const styles = StyleSheet.create({
  large: {
    fontFamily: typography.extraBold,
    fontSize: 32,
    lineHeight: 40,
    fontVariant: ['tabular-nums'],
  },
  amount: {
    fontFamily: typography.bold,
    fontSize: 18,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
});
