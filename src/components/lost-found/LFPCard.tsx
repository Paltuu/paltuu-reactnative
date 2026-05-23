import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';

interface LFPCardProps {
  post: {
    post_id: number;
    post_type: 'lost' | 'found';
    pet_description: string;
    city: string;
    location: string;
    contact_info: string;
    main_image: string;
    post_date: string;
  };
  onPress: () => void;
}

export const LFPCard = ({ post, onPress }: LFPCardProps) => {
  const isLost = post.post_type === 'lost';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="bg-white pt-4 px-4 rounded-2xl mb-3 mx-1.5"
      style={{
        flex: 1,
        maxWidth: '46%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className="relative">
        <Image
          source={
            post.main_image
              ? post.main_image
              : require('../../../assets/dog-placeholder.png')
          }
          style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
          contentFit="cover"
          transition={300}
        />
        {/* Lost / Found badge */}
        <View
          className="absolute top-2 left-2 px-2 py-1 rounded-full"
          style={{ backgroundColor: isLost ? '#EF4444' : '#10B981' }}
        >
          <Text className="text-white text-[10px] font-bold">
            {isLost ? 'Lost' : 'Found'}
          </Text>
        </View>
      </View>

      <View className="py-4">
        <Text className="font-heading text-base text-dark mb-1" numberOfLines={2}>
          {post.pet_description}
        </Text>
        <Text className="font-body text-gray-500 text-xs mb-1" numberOfLines={1}>
          {new Date(post.post_date).toLocaleDateString()}
        </Text>
        <View className="flex-row items-center">
          <Ionicons name="location-sharp" size={14} color="#a03048" />
          <Text className="font-body text-gray-500 text-xs ml-1" numberOfLines={1}>
            {post.city}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
