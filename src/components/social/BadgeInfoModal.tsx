import React from 'react';
import { View, Text, Pressable, Modal, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

/* ── Badge Info Modal ──
 * Generic "what is this badge" popup: plain white rectangle, icon + title,
 * closeable via backdrop tap or the X button. Reusable for any future badge
 * type — currently only wired up for the Day One / Founders Club badge. */
export const BadgeInfoModal = ({
  visible,
  onClose,
  icon,
  ionicon,
  title,
  description,
}: {
  visible: boolean;
  onClose: () => void;
  icon?: any;
  /** Fallback when there's no dedicated image asset for this badge — an Ionicons glyph name, rendered instead of `icon`. */
  ionicon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable className="flex-1 bg-black/50 justify-center items-center px-12" onPress={onClose}>
        <Pressable className="w-full bg-white px-6 pt-10 pb-8 items-center rounded-2xl relative shadow-lg" onPress={(e) => e.stopPropagation()}>
          <TouchableOpacity hitSlop={10} className="absolute top-4 right-4" onPress={onClose}>
            <Ionicons name="close" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          {icon ? (
            <Image source={icon} style={{ width: 52, height: 52 }} tintColor="#A03048" />
          ) : (
            <Ionicons name={ionicon ?? 'information-circle'} size={52} color="#A03048" />
          )}
          <Text className="mt-4 text-xl font-bold text-[#111] text-center tracking-tight">{title}</Text>
          {!!description && (
            <Text className="mt-3 text-sm text-gray-600 text-center leading-6 px-1">{description}</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default BadgeInfoModal;
