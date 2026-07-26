import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheetModal } from '../ui/bottom-sheet/ActionSheetModal';

const bookmarkSelectIcon = require('../../../assets/icons/bookmark-select.svg');
const bookmarkUnselectIcon = require('../../../assets/icons/bookmark-unselect.svg');
const writePostIcon = require('../../../assets/icons/write-post-solid.svg');
const hideIcon = require('../../../assets/icons/hide-solid.svg');
const blockIcon = require('../../../assets/icons/block-solid.svg');
const flagIcon = require('../../../assets/icons/flag-solid.svg');
const trashIcon = require('../../../assets/icons/trash-solid.svg');

interface PostOptionsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  isOwnPost: boolean;
  isSaved: boolean;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onBlock: () => void;
  onHide: () => void;
}

interface OptionRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  customIcon?: any;
  customIconTint?: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  isLast?: boolean;
}

const OptionRow = ({ icon, customIcon, customIconTint, label, onPress, destructive, isLast }: OptionRowProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className={`flex-row items-center gap-4 py-4 ${isLast ? '' : 'border-b border-gray-100'}`}
  >
    {customIcon ? (
      <Image
        source={customIcon}
        style={{ width: 22, height: 22 }}
        contentFit="contain"
        tintColor={customIconTint}
      />
    ) : (
      <Ionicons name={icon!} size={22} color={destructive ? '#DC2626' : '#111'} />
    )}
    <Text className={`text-base font-headingSemi ${destructive ? 'text-red-600' : 'text-dark'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

export const PostOptionsBottomSheet = ({
  visible,
  onClose,
  isOwnPost,
  isSaved,
  onSave,
  onEdit,
  onDelete,
  onReport,
  onBlock,
  onHide,
}: PostOptionsBottomSheetProps) => {
  return (
    <ActionSheetModal visible={visible} onClose={onClose}>
      {(dismiss) => {
        const run = (action: () => void) => () => {
          action();
          dismiss();
        };

        return (
          <View className="px-5 pt-2 pb-8">
            <OptionRow
              customIcon={isSaved ? bookmarkSelectIcon : bookmarkUnselectIcon}
              customIconTint="#000000"
              label={isSaved ? 'Unsave Post' : 'Save Post'}
              onPress={run(onSave)}
            />

            {isOwnPost ? (
              <>
                <OptionRow customIcon={writePostIcon} label="Edit Post" onPress={run(onEdit)} />
                <OptionRow
                  customIcon={trashIcon}
                  customIconTint="#DC2626"
                  label="Delete Post"
                  onPress={run(onDelete)}
                  destructive
                  isLast
                />
              </>
            ) : (
              <>
                <OptionRow customIcon={flagIcon} customIconTint="#111" label="Report" onPress={run(onReport)} />
                <OptionRow customIcon={hideIcon} customIconTint="#111" label="Hide" onPress={run(onHide)} />
                <OptionRow
                  customIcon={blockIcon}
                  customIconTint="#DC2626"
                  label="Block User"
                  onPress={run(onBlock)}
                  destructive
                  isLast
                />
              </>
            )}
          </View>
        );
      }}
    </ActionSheetModal>
  );
};

export default PostOptionsBottomSheet;
