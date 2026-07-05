import React from 'react';
import { Image, View, ViewStyle } from 'react-native';
import { NO_PROFILE_IMAGE } from '../../constants/images';

const GRAY_100 = '#F3F4F6';

export const Avatar = ({
  uri,
  size,
  shape = 'circle',
  radius = 16,
  fallbackSource = NO_PROFILE_IMAGE,
  style,
}: {
  uri?: string | null;
  size: number;
  shape?: 'circle' | 'square';
  radius?: number;
  fallbackSource?: number | { uri: string };
  style?: ViewStyle;
}) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: shape === 'circle' ? size / 2 : radius,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: GRAY_100,
      },
      style,
    ]}
  >
    <Image
      source={uri ? { uri } : fallbackSource}
      style={{ width: size, height: size, backgroundColor: '#FFFFFF' }}
      resizeMode="cover"
    />
  </View>
);

export default Avatar;
