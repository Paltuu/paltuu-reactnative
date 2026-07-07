import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { COLORS } from '../../constants/colors';

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 6,
};

const VARIANTS = {
  success: { icon: 'checkmark-circle', color: COLORS.success, bgClass: 'bg-successSoft' },
  error: { icon: 'close-circle', color: COLORS.error, bgClass: 'bg-errorSoft' },
  info: { icon: 'paw', color: COLORS.primary, bgClass: 'bg-primarySoft' },
} as const;

function PaltuuToast({ variant, text1, text2 }: { variant: keyof typeof VARIANTS; text1?: string; text2?: string }) {
  const { icon, color, bgClass } = VARIANTS[variant];
  return (
    <View
      className="flex-row items-center bg-white rounded-2xl px-4 py-3.5 w-[92%] gap-3"
      style={cardShadow}
    >
      <View className={`w-9 h-9 rounded-full items-center justify-center ${bgClass}`}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View className="flex-1">
        {!!text1 && (
          <Text className="font-headingSemi text-dark text-sm" numberOfLines={1}>
            {text1}
          </Text>
        )}
        {!!text2 && (
          <Text className="font-body text-xs text-gray mt-0.5" numberOfLines={2}>
            {text2}
          </Text>
        )}
      </View>
    </View>
  );
}

export const toastConfig: ToastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<any>) => (
    <PaltuuToast variant="success" text1={text1} text2={text2} />
  ),
  error: ({ text1, text2 }: ToastConfigParams<any>) => (
    <PaltuuToast variant="error" text1={text1} text2={text2} />
  ),
  info: ({ text1, text2 }: ToastConfigParams<any>) => (
    <PaltuuToast variant="info" text1={text1} text2={text2} />
  ),
};
