import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ 
  title, 
  onPress, 
  loading, 
  disabled,
  className = "",
}) => {
  return (
    <TouchableOpacity
      className={`h-[52px] bg-primary rounded-button justify-center items-center w-full ${disabled || loading ? 'opacity-40' : ''} ${className}`}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className="text-white text-base font-headingSemi">{title}</Text>
      )}
    </TouchableOpacity>
  );
};
