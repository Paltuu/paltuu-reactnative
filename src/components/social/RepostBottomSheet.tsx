import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ActionSheetModal } from '../ui/bottom-sheet/ActionSheetModal';

const repostIcon = require('../../../assets/icons/repost-select.svg');
const writePostIcon = require('../../../assets/icons/write-post-solid.svg');

interface RepostBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  isReposted: boolean;
  /** Quick repost / undo repost (no caption). */
  onRepost: () => void;
  /** Open the quote composer. */
  onQuote: () => void;
}

export const RepostBottomSheet = ({
  visible,
  onClose,
  isReposted,
  onRepost,
  onQuote,
}: RepostBottomSheetProps) => {
  return (
    <ActionSheetModal visible={visible} onClose={onClose}>
      {(dismiss) => {
        const run = (action: () => void) => () => {
          action();
          dismiss();
        };

        return (
          <View className="px-5 pt-2 pb-8">
            <TouchableOpacity
              onPress={run(onRepost)}
              activeOpacity={0.7}
              className="flex-row items-center gap-4 py-4 border-b border-gray-100"
            >
              <Image
                source={repostIcon}
                style={{ width: 24, height: 24 }}
                tintColor="#000000"
              />
              <Text className="text-base font-headingSemi text-dark">
                {isReposted ? 'Undo Repost' : 'Repost'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={run(onQuote)}
              activeOpacity={0.7}
              className="flex-row items-center gap-4 py-4"
            >
              <Image
                source={writePostIcon}
                style={{ width: 24, height: 24 }}
                tintColor="#111111"
              />
              <Text className="text-base font-headingSemi text-dark">
                Quote Post
              </Text>
            </TouchableOpacity>
          </View>
        );
      }}
    </ActionSheetModal>
  );
};

export default RepostBottomSheet;
