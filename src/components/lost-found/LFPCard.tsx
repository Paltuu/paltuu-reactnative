import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
      className="bg-surface rounded-card mb-5 shadow-sm overflow-hidden border-l-4"
      style={{ borderLeftColor: isLost ? '#EF4444' : '#10B981' }}
    >
      <View className="flex-row">
        <Image 
          source={{ uri: post.main_image || 'https://placehold.co/400x400/A03048/FFFFFF.png?text=' + post.post_type }} 
          className="w-32 h-32"
          resizeMode="cover"
        />
        
        <View className="flex-1 p-3 justify-between">
          <View>
            <View className="flex-row items-center justify-between mb-1">
              <View className={`px-2 py-0.5 rounded-md ${isLost ? 'bg-red-100' : 'bg-green-100'}`}>
                <Text className={`text-[10px] font-heading ${isLost ? 'text-red-500' : 'text-green-500'}`}>
                  {post.post_type.toUpperCase()}
                </Text>
              </View>
              <Text className="text-[10px] text-gray-400 font-body">
                {new Date(post.post_date).toLocaleDateString()}
              </Text>
            </View>
            
            <Text className="font-heading text-sm text-dark mb-1" numberOfLines={1}>
              {post.pet_description}
            </Text>
            
            <View className="flex-row items-center">
              <Feather name="map-pin" size={10} color="#9CA3AF" />
              <Text className="text-[10px] text-gray-500 font-body ml-1" numberOfLines={1}>
                {post.location}, {post.city}
              </Text>
            </View>
          </View>

          <TouchableOpacity className="bg-gray-50 p-2 rounded-lg flex-row items-center justify-center">
            <Feather name="phone" size={12} color="#A03048" />
            <Text className="text-[10px] font-heading text-primary ml-2">CONTACT OWNER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};
