import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColors } from '../theme';

interface BoundaryState {
  error: Error | null;
}

const CrashFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <View style={[styles.badge, { backgroundColor: colors.errorContainer }]}>
        <Text style={[styles.badgeText, { color: colors.error }]}>!</Text>
      </View>
      <Text style={[styles.title, { color: colors.onSurface }]}>Something went wrong</Text>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        This screen crashed. Try again — your saved data is kept.
      </Text>
      <Pressable
        onPress={onRetry}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Try again</Text>
      </Pressable>
    </View>
  );
};

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[DILAAL] Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <CrashFallback onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  badge: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 22, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 12, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  button: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  buttonText: { fontSize: 12, fontWeight: '700' },
});
