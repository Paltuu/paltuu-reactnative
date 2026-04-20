import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';

interface CustomInputProps extends TextInputProps {
  label: string;
  error?: string;
  containerClassName?: string;
}

export const CustomInput: React.FC<CustomInputProps> = ({ label, error, containerClassName = "", ...props }) => {
  return (
    <View className={`mb-5 w-full ${containerClassName}`}>
      <Text className="font-bodyMedium text-gray-700 mb-2">{label}</Text>
      <TextInput
        className={`h-[52px] border ${error ? 'border-error' : 'border-gray-300'} rounded-button px-4 text-dark bg-white font-body`}
        placeholderTextColor="#999999"
        {...props}
      />
      {error && <Text className="text-error text-xs mt-1 font-body">{error}</Text>}
    </View>
  );
};
