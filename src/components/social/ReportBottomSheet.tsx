import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetFlatList, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useMutation } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { REPORT_REASONS, ReportReasonCode } from '../../constants/reportReasons';

interface ReportBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'post' | 'user' | 'comment';
  targetId: string | number | null;
}

export const ReportBottomSheet = ({ visible, onClose, targetType, targetId }: ReportBottomSheetProps) => {
  const [selectedReason, setSelectedReason] = useState<ReportReasonCode | null>(null);
  const [additionalNote, setAdditionalNote] = useState('');
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => ['50%', '85%'], []);

  useEffect(() => {
    if (visible && targetId) {
      // Reset state on open
      setSelectedReason(null);
      setAdditionalNote('');
      const timer = setTimeout(() => {
        bottomSheetModalRef.current?.present();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible, targetId]);

  const reportMutation = useMutation({
    mutationFn: async (payload: { reason_code: string; additional_note?: string }) => {
      if (!targetId) return;
      if (targetType === 'post') {
        return socialApi.reportPost(targetId, payload);
      } else if (targetType === 'comment') {
        return socialApi.reportComment(targetId, payload);
      } else {
        return socialApi.reportUser(targetId, payload);
      }
    },
    onSuccess: () => {
      // Not strictly necessary since we optimistic close, but good for debug
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Report failed',
        text2: err?.message || 'Something went wrong',
      });
    },
  });

  const handleReasonPress = (reasonCode: ReportReasonCode) => {
    if (reasonCode === 'OTHER') {
      setSelectedReason(reasonCode);
      // Let user type additional note and submit manually
    } else {
      // Optimistic submit
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Report submitted',
        text2: 'Thanks for letting us know.',
      });
      reportMutation.mutate({ reason_code: reasonCode });
    }
  };

  const submitOther = () => {
    if (!additionalNote.trim()) return;
    onClose();
    Toast.show({
      type: 'success',
      text1: 'Report submitted',
      text2: 'Thanks for letting us know.',
    });
    reportMutation.mutate({ reason_code: 'OTHER', additional_note: additionalNote.trim() });
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    []
  );

  const handleClose = () => {
    if (selectedReason === 'OTHER') {
      // Go back to reasons list
      setSelectedReason(null);
      setAdditionalNote('');
    } else {
      onClose();
    }
  };

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={selectedReason === 'OTHER' ? 1 : 0}
      snapPoints={snapPoints}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: '#E5E7EB', width: 40 }}
    >
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between py-4 border-b border-gray-100 px-5">
          <TouchableOpacity onPress={handleClose}>
            <Text className="text-sm font-headingSemi text-gray-500">
              {selectedReason === 'OTHER' ? 'Back' : 'Cancel'}
            </Text>
          </TouchableOpacity>
          <Text className="text-base font-heading text-dark">
            {selectedReason === 'OTHER' ? 'Additional details' : 'Report'}
          </Text>
          {selectedReason === 'OTHER' ? (
            <TouchableOpacity onPress={submitOther} disabled={!additionalNote.trim()}>
              <Text className={`text-sm font-headingSemi ${additionalNote.trim() ? 'text-primary' : 'text-gray-300'}`}>
                Submit
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {selectedReason !== 'OTHER' ? (
          <View className="flex-1">
            <View className="px-5 py-4">
              <Text className="text-lg font-headingSemi text-dark mb-1">
                Why are you reporting this {targetType}?
              </Text>
              <Text className="text-sm font-body text-gray-500 mb-2">
                Your report is anonymous, except if you're reporting an intellectual property infringement.
              </Text>
            </View>
            <BottomSheetFlatList
              data={REPORT_REASONS}
              keyExtractor={(item) => item.code}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleReasonPress(item.code)}
                  className="flex-row items-center justify-between py-4 border-b border-gray-100 px-5"
                >
                  <Text className="text-base font-body text-dark">{item.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          <View className="flex-1 px-5 py-4">
            <Text className="text-base font-headingSemi text-dark mb-3">
              Please provide more context
            </Text>
            <BottomSheetTextInput
              autoFocus
              multiline
              textAlignVertical="top"
              placeholder="What happened?"
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 h-40 text-base font-body text-dark"
              placeholderTextColor="#9CA3AF"
              value={additionalNote}
              onChangeText={setAdditionalNote}
              maxLength={500}
            />
            <Text className="text-xs font-body text-gray-400 text-right mt-2">
              {additionalNote.length} / 500
            </Text>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
};
