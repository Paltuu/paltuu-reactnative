import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ProductCardProps {
  product: {
    product_id: number;
    title: string;
    price: number | string;
    image_url?: string;
    images?: string[];
    main_image?: string;
    image?: string;
    category_name?: string;
    categories?: { name: string }[];
    compare_at_price?: number | string;
  };
  onPress: () => void;
}

export const ProductCard = ({ product, onPress }: ProductCardProps) => {
  const displayImage = product.image_url || product.main_image || product.image || (Array.isArray(product.images) ? product.images[0] : null);
  const displayCategory = product.category_name || (Array.isArray(product.categories) ? product.categories[0]?.name : 'Product');
  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const comparePrice = typeof product.compare_at_price === 'string' ? parseFloat(product.compare_at_price) : product.compare_at_price;
  const hasDiscount = comparePrice && comparePrice > price;

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={onPress}
      className="bg-surface rounded-card overflow-hidden mb-4 shadow-sm"
      style={{ width: '48%' }}
    >
      <View className="relative">
        <Image 
          source={{ uri: displayImage || 'https://placehold.co/400x400/A03048/FFFFFF.png?text=Paltuu' }} 
          className="w-full aspect-square"
          resizeMode="cover"
        />
        {hasDiscount && (
          <View className="absolute top-2 left-2 bg-primary px-2 py-1 rounded-md">
            <Text className="text-white font-heading text-[10px]">SAVE</Text>
          </View>
        )}
      </View>

      <View className="p-3">
        <Text className="text-gray-400 font-body text-[10px] uppercase mb-1">
          {displayCategory}
        </Text>
        <Text className="font-heading text-sm text-dark mb-2" numberOfLines={1}>
          {product.title}
        </Text>

        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-primary font-heading text-base">
              Rs {price.toLocaleString()}
            </Text>
            {hasDiscount && (
              <Text className="text-gray-400 font-body text-xs line-through">
                Rs {comparePrice?.toLocaleString()}
              </Text>
            )}
          </View>

          <TouchableOpacity className="bg-primary/10 p-2 rounded-full">
            <Feather name="shopping-cart" size={16} color="#A03048" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};
