import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { getApiErrorInfo } from '../../utils/apiError';

interface QueryErrorStateProps {
  error: unknown;
  fallbackMessage: string;
  onRetry: () => void;
}

export function QueryErrorState({ error, fallbackMessage, onRetry }: QueryErrorStateProps) {
  const { title, message } = getApiErrorInfo(error, fallbackMessage);
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  title: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textDark, textAlign: 'center' },
  message: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  retryButton: { marginTop: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary },
  retryText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.primary },
});
