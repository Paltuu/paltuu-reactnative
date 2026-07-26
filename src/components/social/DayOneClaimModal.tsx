import React from 'react';
import { View, Text, Pressable, Modal, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';

const DayOneIcon = require('../../../assets/icons/day1-badge.svg');

/* ── Day One Claim Modal ──
 * Shown once, ever, the first time a Day One / Founders Club member opens
 * the app after the badge went live — thanks them and lets them "claim" the
 * badge (dismisses the one-time prompt; the badge itself is always on from
 * then on based on their founding_club flag). */
export const DayOneClaimModal = ({
  visible,
  onClaim,
}: {
  visible: boolean;
  onClaim: () => void;
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent>
      <View className="flex-1 bg-black/50 justify-center items-center px-8">
        <View className="w-full bg-white p-6 items-center rounded-2xl">
          <Image source={DayOneIcon} style={{ width: 56, height: 56 }} tintColor="#A03048" />
          <Text className="mt-4 text-lg font-bold text-[#111] text-center">Day 1s</Text>
          <Text className="mt-2 text-sm text-gray-600 text-center leading-5">
            Before we let everyone in, here's a badge for your support towards Paltuu.{"\n\n"}We are forever grateful.
          </Text>
          <TouchableOpacity
            className="mt-5 w-full bg-primary py-3.5 rounded-xl items-center"
            onPress={onClaim}
          >
            <Text className="text-white font-bold">Claim Badge</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default DayOneClaimModal;
