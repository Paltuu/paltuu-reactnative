import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';

interface ProductCardProps {
  product: any;
  onPress: () => void;
  style?: any;
}

export const ProductCard = ({ product, onPress, style }: ProductCardProps) => {
  // Ultra-robust field mapping
  const name = product.title || product.name || 'Product';
  
  // Handle various image formats (string, object with url, array of strings, array of objects)
  const getImageUrl = () => {
    const rawImage = product.image_url || product.main_image || product.image || (Array.isArray(product.images) ? product.images[0] : null);
    if (!rawImage) return null;
    if (typeof rawImage === 'string') return rawImage;
    if (typeof rawImage === 'object' && rawImage.url) return rawImage.url;
    if (typeof rawImage === 'object' && rawImage.uri) return rawImage.uri;
    if (typeof rawImage === 'object' && rawImage.image_url) return rawImage.image_url;
    if (typeof rawImage === 'object' && rawImage.src) return rawImage.src;
    return null;
  };
  
  const imageUrl = getImageUrl();
  const price = typeof product.price === 'string' ? parseFloat(product.price) : (product.price || 0);
  const originalPriceRaw = product.original_price || product.compare_at_price;
  const originalPrice = originalPriceRaw ? (typeof originalPriceRaw === 'string' ? parseFloat(originalPriceRaw) : originalPriceRaw) : null;
  
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercentage = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  
  const inStock = product.inStock !== undefined ? product.inStock : (product.stock > 0 || true);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="bg-white pt-4 px-4 rounded-[2.5rem] shadow-sm border border-gray-100 mb-4 overflow-hidden"
      style={[{ width: '100%' }, style]}
    >
      <View className="relative bg-gray-50 rounded-2xl p-2 mb-2">
        <Image
          source={{ uri: imageUrl || `https://placehold.co/400x400/A03048/FFFFFF.png?text=${encodeURIComponent(name)}` }}
          style={{ width: '100%', aspectRatio: 1 }}
          className="rounded-xl"
          contentFit="contain"
        />
        {inStock === false && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center rounded-xl">
            <Text className="text-white font-heading text-xs uppercase">Out of Stock</Text>
          </View>
        )}
      </View>

      <View className="pb-4">
        <Text className="font-heading text-sm text-dark mb-1 h-10 leading-snug" numberOfLines={2}>
          {name}
        </Text>

        <View>
          <View className="flex-row items-center flex-wrap">
            <Text className="text-primary font-heading text-sm mr-2">
              PKR {price.toLocaleString()}
            </Text>
            {hasDiscount && (
              <View className="flex-row items-center">
                <Text className="text-gray-400 font-body text-xs line-through mr-2">
                  {originalPrice?.toLocaleString()}
                </Text>
                <Text className="text-green-600 font-headingSemi text-[10px]">
                  -{discountPercentage}%
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
