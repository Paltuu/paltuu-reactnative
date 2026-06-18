import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheetModal } from '../ui/bottom-sheet/ActionSheetModal';

interface PostOptionsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  isOwnPost: boolean;
  isFollowing: boolean;
  isSaved: boolean;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onBlock: () => void;
  onUnfollow: () => void;
  onHide: () => void;
}

interface OptionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  isLast?: boolean;
}

const OptionRow = ({ icon, label, onPress, destructive, isLast }: OptionRowProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className={`flex-row items-center gap-4 py-4 ${isLast ? '' : 'border-b border-gray-100'}`}
  >
    <Ionicons name={icon} size={22} color={destructive ? '#DC2626' : '#111'} />
    <Text className={`text-base font-headingSemi ${destructive ? 'text-red-600' : 'text-dark'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

export const PostOptionsBottomSheet = ({
  visible,
  onClose,
  isOwnPost,
  isFollowing,
  isSaved,
  onSave,
  onEdit,
  onDelete,
  onReport,
  onBlock,
  onUnfollow,
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
            <Text className="text-lg font-heading text-dark text-center mb-4">
              Post Options
            </Text>

            <OptionRow
              icon={isSaved ? 'bookmark' : 'bookmark-outline'}
              label={isSaved ? 'Unsave Post' : 'Save Post'}
              onPress={run(onSave)}
            />

            {isOwnPost ? (
              <>
                <OptionRow icon="create-outline" label="Edit Post" onPress={run(onEdit)} />
                <OptionRow
                  icon="trash-outline"
                  label="Delete Post"
                  onPress={run(onDelete)}
                  destructive
                  isLast
                />
              </>
            ) : (
              <>
                <OptionRow icon="flag-outline" label="Report" onPress={run(onReport)} />
                {isFollowing && (
                  <OptionRow icon="person-remove-outline" label="Unfollow" onPress={run(onUnfollow)} />
                )}
                <OptionRow icon="eye-off-outline" label="Hide" onPress={run(onHide)} />
                <OptionRow
                  icon="ban-outline"
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
