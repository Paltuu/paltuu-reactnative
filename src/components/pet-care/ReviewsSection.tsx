import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetTextInput, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Avatar } from '../common/Avatar';
import { PrimaryButton } from '../common/PrimaryButton';
import { submitReview } from '../../api/clinics';
import { useAuthStore } from '../../stores/authStore';
import { FONTS } from '../../constants/typography';

const PRIMARY = '#A03048';
const DARK = '#1A1A2E';
const MUTED = '#6B7280';

export interface Review {
  review_id: string | number;
  rating: number;
  review_content: string;
  review_date: string;
  review_maker_profile_image_url: string | null;
  review_maker_name: string;
}

interface ReviewsSectionProps {
  targetType: 'vet' | 'clinic';
  targetId: string | number;
  averageRating: number;
  reviewsCount: number;
  reviews: Review[];
  onReviewSubmitted: () => void;
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={rating >= i ? 'star' : 'star-outline'}
          size={size}
          color="#F5A623"
        />
      ))}
    </View>
  );
}

export function ReviewsSection({
  targetType,
  targetId,
  averageRating,
  reviewsCount,
  reviews,
  onReviewSubmitted,
}: ReviewsSectionProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sheetRef = useRef<BottomSheetModal>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState('');

  const snapPoints = useMemo(() => ['60%'], []);

  const mutation = useMutation({
    mutationFn: () => submitReview({ target_id: targetId, type: targetType, rating: selectedRating, comment: comment.trim() }),
    onSuccess: () => {
      sheetRef.current?.dismiss();
      setSelectedRating(0);
      setComment('');
      Toast.show({ type: 'success', text1: 'Review submitted!' });
      onReviewSubmitted();
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Failed to submit review', text2: 'Please try again.' });
    },
  });

  const handleWriteReview = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    setSelectedRating(0);
    setComment('');
    sheetRef.current?.present();
  }, [isAuthenticated, router]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
    ),
    []
  );

  const canSubmit = selectedRating > 0 && comment.trim().length > 0 && !mutation.isPending;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Reviews</Text>
          {reviewsCount > 0 && (
            <View style={styles.statsRow}>
              <Text style={styles.avgValue}>{averageRating.toFixed(1)}</Text>
              <StarRow rating={Math.round(averageRating)} />
              <Text style={styles.countText}>({reviewsCount})</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleWriteReview} style={styles.writeBtn}>
          <Text style={styles.writeBtnText}>{isAuthenticated ? 'Write Review' : 'Login to Review'}</Text>
        </TouchableOpacity>
      </View>

      {reviews.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          {reviews.map((review, index) => (
            <View
              key={review.review_id}
              style={[styles.reviewRow, index !== reviews.length - 1 && styles.reviewRowBorder]}
            >
              <Avatar uri={review.review_maker_profile_image_url} size={40} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.reviewHeaderRow}>
                  <Text style={styles.reviewerName} numberOfLines={1}>
                    {review.review_maker_name}
                  </Text>
                  <Text style={styles.reviewDate}>
                    {new Date(review.review_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <StarRow rating={review.rating} size={12} />
                <Text style={styles.reviewContent}>{review.review_content}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No reviews yet. Be the first to review!</Text>
        </View>
      )}

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: '#E5E7EB', width: 40 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Share Your Experience</Text>

          <View style={styles.ratingInputRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity key={i} onPress={() => setSelectedRating(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <Ionicons
                  name={selectedRating >= i ? 'star' : 'star-outline'}
                  size={34}
                  color="#F5A623"
                  style={{ marginHorizontal: 4 }}
                />
              </TouchableOpacity>
            ))}
          </View>

          <BottomSheetTextInput
            autoFocus
            multiline
            textAlignVertical="top"
            placeholder="Tell us about your experience..."
            placeholderTextColor="#9CA3AF"
            value={comment}
            onChangeText={setComment}
            maxLength={500}
            style={styles.textInput}
          />
          <Text style={styles.charCount}>{comment.length} / 500</Text>

          <PrimaryButton
            title="Submit Review"
            onPress={() => mutation.mutate()}
            disabled={!canSubmit}
            loading={mutation.isPending}
            style={{ marginTop: 8 }}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flex: 1 },
  title: { fontFamily: FONTS.heading, fontSize: 16, color: DARK },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  avgValue: { fontFamily: FONTS.heading, fontSize: 15, color: DARK },
  countText: { fontFamily: FONTS.body, fontSize: 13, color: MUTED },
  writeBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  writeBtnText: { color: '#FFF', fontFamily: FONTS.headingSemi, fontSize: 12.5 },

  reviewRow: { flexDirection: 'row', paddingBottom: 16, marginBottom: 16 },
  reviewRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F2' },
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  reviewerName: { fontFamily: FONTS.headingSemi, fontSize: 13.5, color: DARK, flex: 1, marginRight: 8 },
  reviewDate: { fontFamily: FONTS.body, fontSize: 11, color: '#9AA0A6' },
  reviewContent: { fontFamily: FONTS.body, fontSize: 13, color: MUTED, lineHeight: 19, marginTop: 6 },

  emptyState: {
    marginTop: 16,
    paddingVertical: 32,
    backgroundColor: '#FAFAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: { fontFamily: FONTS.body, fontSize: 13, color: MUTED },

  sheetContent: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  sheetTitle: { fontFamily: FONTS.heading, fontSize: 17, color: DARK, marginBottom: 16, textAlign: 'center' },
  ratingInputRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 18 },
  textInput: {
    backgroundColor: '#FAFAFB',
    borderWidth: 1,
    borderColor: '#F0F0F2',
    borderRadius: 16,
    padding: 14,
    height: 120,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: DARK,
  },
  charCount: { fontFamily: FONTS.body, fontSize: 11, color: '#9AA0A6', textAlign: 'right', marginTop: 6, marginBottom: 8 },
});
