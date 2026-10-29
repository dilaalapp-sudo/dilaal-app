import { useApp } from './context/AppContext';

export const palette = {
  surface: '#faf8ff',
  surfaceDim: '#d2d9f4',
  surfaceBright: '#faf8ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3ff',
  surfaceContainer: '#eaedff',
  surfaceContainerHigh: '#e2e7ff',
  surfaceContainerHighest: '#dae2fd',
  onSurface: '#131b2e',
  onSurfaceVariant: '#404944',
  inverseSurface: '#283044',
  inverseOnSurface: '#eef0ff',
  outline: '#707974',
  outlineVariant: '#bfc9c3',
  surfaceTint: '#2b6954',
  primary: '#003527',
  onPrimary: '#ffffff',
  primaryContainer: '#064e3b',
  onPrimaryContainer: '#80bea6',
  inversePrimary: '#95d3ba',
  secondary: '#904d00',
  onSecondary: '#ffffff',
  secondaryContainer: '#fe932c',
  onSecondaryContainer: '#663500',
  tertiary: '#003625',
  onTertiary: '#ffffff',
  tertiaryContainer: '#004f38',
  onTertiaryContainer: '#66c49d',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  primaryFixed: '#b0f0d6',
  primaryFixedDim: '#95d3ba',
  onPrimaryFixed: '#002117',
  onPrimaryFixedVariant: '#0b513d',
  secondaryFixed: '#ffdcc3',
  secondaryFixedDim: '#ffb77d',
  onSecondaryFixed: '#2f1500',
  onSecondaryFixedVariant: '#6e3900',
  tertiaryFixed: '#97f5cc',
  tertiaryFixedDim: '#7bd8b1',
  onTertiaryFixed: '#002115',
  onTertiaryFixedVariant: '#00513a',
  background: '#faf8ff',
  onBackground: '#131b2e',
  surfaceVariant: '#dae2fd',
  success: '#059669',
  pending: '#b45309',
};

export const darkPalette = {
  ...palette,
  surface: '#0b1410',
  surfaceDim: '#060b08',
  surfaceBright: '#12201a',
  surfaceContainerLowest: '#0e1914',
  surfaceContainerLow: '#13221c',
  surfaceContainer: '#182a23',
  surfaceContainerHigh: '#1e332a',
  surfaceContainerHighest: '#263e34',
  onSurface: '#e5f2eb',
  onSurfaceVariant: '#a2b8ad',
  inverseSurface: '#eef0ff',
  inverseOnSurface: '#283044',
  outline: '#81988e',
  outlineVariant: '#2d4238',
  surfaceTint: '#80bea6',
  primary: '#80bea6',
  onPrimary: '#002117',
  primaryContainer: '#004f38',
  onPrimaryContainer: '#b0f0d6',
  inversePrimary: '#003527',
  background: '#0b1410',
  onBackground: '#e5f2eb',
  surfaceVariant: '#182a23',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  gutter: 24,
  gutterSm: 16,
};

export const typography = {
  sans: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
};

export const shadow = {
  card: {
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
};

export type Palette = typeof palette;

export const useColors = (): Palette => {
  const { isDarkMode } = useApp();
  return isDarkMode ? (darkPalette as Palette) : palette;
};
