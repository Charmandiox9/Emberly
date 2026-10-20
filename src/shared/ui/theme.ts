import { useColorScheme } from 'react-native';

export interface Theme {
  readonly background: string;
  readonly surface: string;
  readonly raised: string;
  readonly text: string;
  readonly secondary: string;
  readonly border: string;
  readonly primary: string;
  readonly onPrimary: string;
  readonly danger: string;
}

const light: Theme = {
  background: '#FFF1E6',
  surface: '#FFFAF6',
  raised: '#FFFFFF',
  text: '#281B14',
  secondary: '#70584A',
  border: '#E5CDBD',
  primary: '#FF7A3D',
  onPrimary: '#281B14',
  danger: '#A52F25',
};

const dark: Theme = {
  background: '#281B14',
  surface: '#35251D',
  raised: '#422E23',
  text: '#FFF1E6',
  secondary: '#D8BFAE',
  border: '#765D4E',
  primary: '#FF7A3D',
  onPrimary: '#281B14',
  danger: '#FFB4A6',
};

export const typography = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
