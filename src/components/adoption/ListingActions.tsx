// Owner actions on one of their listings (edit, share, pause, relist, mark
// adopted, delete), shared by My Listings and the listing page, plus the
// bottom sheet that offers them.
import React, { useState } from 'react';
import { Alert, Share, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useShallow } from 'zustand/react/shallow';
import { usePetStore } from '../../stores/petStore';
import { getShareUrl } from '../../utils/share';
import { showApiErrorAlert } from '../../utils/apiError';
import { FONTS } from '../../constants/typography';
import { applicantName, getListingStatus, LISTING_STATUS_LABEL, plural, requestStatus } from '../../utils/adoption';
import { AC, AdoptionSheet, Button, Divider, PetPhoto, SheetRow } from './ui';

/**
 * Error alert for adoption actions. The availability endpoint explains its
 * 409/429 refusals ("Listings can be renewed once every 7 days"), so show
 * that text; anything else gets the shared network-aware message.
 */
export function showAdoptionError(error: unknown, fallback: string) {
  if (
    axios.isAxiosError(error) &&
    error.response &&
    (error.response.status === 409 || error.response.status === 429) &&
    typeof error.response.data?.error === 'string'
  ) {
    Alert.alert("Couldn't update the listing", error.response.data.error);
    return;
  }
  showApiErrorAlert(error, fallback);
}

export type ListingActions = ReturnType<typeof useListingActions>;

export function useListingActions() {
  const router = useRouter();
  const { setListingAvailability, updatePetStatus, deletePet } = usePetStore(
    useShallow((state) => ({
      setListingAvailability: state.setListingAvailability,
      updatePetStatus: state.updatePetStatus,
      deletePet: state.deletePet,
    }))
  );
  // `${petId}:${action}` while a request is in flight, for button spinners.
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, task: () => Promise<void>, success: string, fallback: string) => {
    setBusy(key);
    try {
      await task();
      Toast.show({ type: 'success', text1: success });
      return true;
    } catch (error) {
      showAdoptionError(error, fallback);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const UPDATE_FAILED = "We couldn't update the listing. Please try again.";

  return {
    busy,

    edit: (pet: any) => router.push({ pathname: '/(app)/create-pet', params: { editId: pet.pet_id } }),

    share: (pet: any) => {
      Share.share({ message: getShareUrl(`pet-details?petId=${pet.pet_id}`) }).catch(() => {});
    },

    viewAsAdopter: (pet: any) => router.push({ pathname: '/(app)/pet-details', params: { id: pet.pet_id } }),

    /** "Still available" on a check-in: renews the listing. */
    keepListed: (pet: any) =>
      run(
        `${pet.pet_id}:keep`,
        () => setListingAvailability(pet.pet_id, true),
        `${pet.pet_name} stays near the top of the adoption page`,
        UPDATE_FAILED
      ),

    relist: (pet: any) =>
      run(
        `${pet.pet_id}:relist`,
        () => setListingAvailability(pet.pet_id, true),
        `${pet.pet_name} is back on the adoption page`,
        UPDATE_FAILED
      ),

    // Undoes "adopted". The availability endpoint refuses adopted listings, so
    // this sets the status directly, the way the old Status button did.
    markAvailable: (pet: any) => {
      const approved = usePetStore
        .getState()
        .adoptionRequests.find((r) => r.pet_id === pet.pet_id && requestStatus(r) === 'approved');
      Alert.alert(
        `Mark ${pet.pet_name} as available again?`,
        `${pet.pet_name} goes back on the adoption page and people can apply again.${
          approved ? ` ${applicantName(approved)}'s application stays approved.` : ''
        }`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark as available',
            onPress: () => {
              run(
                `${pet.pet_id}:available`,
                () => updatePetStatus(pet.pet_id, 'available'),
                `${pet.pet_name} is back on the adoption page`,
                UPDATE_FAILED
              );
            },
          },
        ]
      );
    },

    markAdopted: (pet: any) => {
      const pending = Number(pet.pending_application_count) || 0;
      Alert.alert(
        `Mark ${pet.pet_name} as adopted?`,
        pending > 0
          ? `${pet.pet_name} comes off the adoption page. If one of your applicants is adopting, approve their application instead, so everyone who applied hears back.`
          : `${pet.pet_name} comes off the adoption page.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark as adopted',
            onPress: () => {
              run(
                `${pet.pet_id}:adopted`,
                () => setListingAvailability(pet.pet_id, false),
                `${pet.pet_name} is marked as adopted`,
                UPDATE_FAILED
              );
            },
          },
        ]
      );
    },

    pause: (pet: any) =>
      Alert.alert(
        `Pause ${pet.pet_name}'s listing?`,
        "It's hidden from the adoption page until you relist it. Applications you already have stay here.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pause',
            onPress: () => {
              run(
                `${pet.pet_id}:pause`,
                () => updatePetStatus(pet.pet_id, 'paused'),
                `${pet.pet_name}'s listing is paused`,
                UPDATE_FAILED
              );
            },
          },
        ]
      ),

    remove: (pet: any, onDeleted?: () => void) =>
      Alert.alert(
        'Delete this listing?',
        `${pet.pet_name}'s listing and all its applications are removed. This can't be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const ok = await run(
                `${pet.pet_id}:delete`,
                () => deletePet(pet.pet_id),
                'Listing deleted',
                "We couldn't delete the listing. Please try again."
              );
              if (ok) onDeleted?.();
            },
          },
        ]
      ),
  };
}

export function ListingActionsSheet({
  pet,
  onClose,
  actions,
  onDeleted,
}: {
  pet: any | null;
  onClose: () => void;
  actions: ListingActions;
  onDeleted?: () => void;
}) {
  return (
    <AdoptionSheet visible={!!pet} onClose={onClose}>
      {(choose) => {
        if (!pet) return null;
        const status = getListingStatus(pet);
        const canMarkAdopted = !!pet.approved && (status === 'live' || status === 'paused');
        const apps = Number(pet.application_count) || 0;
        const statusLine = [LISTING_STATUS_LABEL[status], apps ? plural(apps, 'application', 'applications') : null]
          .filter(Boolean)
          .join(' · ');
        return (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 8 }}>
              <PetPhoto uri={pet.image_url} size={48} radius={12} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: FONTS.heading, fontSize: 16, lineHeight: 22, color: AC.ink }} numberOfLines={1}>
                  {pet.pet_name}
                </Text>
                <Text style={{ fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, color: AC.muted }}>{statusLine}</Text>
              </View>
            </View>

            {status !== 'adopted' && (
              <SheetRow icon="create-outline" label="Edit listing" onPress={() => choose(() => actions.edit(pet))} />
            )}
            {status === 'live' && (
              <SheetRow icon="share-social-outline" label="Share listing" onPress={() => choose(() => actions.share(pet))} />
            )}
            <SheetRow icon="eye-outline" label="View as adopter" onPress={() => choose(() => actions.viewAsAdopter(pet))} />

            {status !== 'review' && <Divider style={{ marginVertical: 6 }} />}
            {canMarkAdopted && (
              <SheetRow
                icon="checkmark-circle-outline"
                label="Mark as adopted"
                onPress={() => choose(() => actions.markAdopted(pet))}
              />
            )}
            {status === 'live' && (
              <SheetRow
                icon="pause-circle-outline"
                label="Pause listing"
                detail="Hidden from the adoption page until you relist"
                onPress={() => choose(() => actions.pause(pet))}
              />
            )}
            {status === 'paused' && (
              <SheetRow
                icon="play-circle-outline"
                label="Relist"
                detail="Shows on the adoption page again"
                onPress={() => choose(() => actions.relist(pet))}
              />
            )}
            {status === 'adopted' && (
              <SheetRow
                icon="arrow-undo-outline"
                label="Mark as available again"
                detail="Back on the adoption page, open to applications"
                onPress={() => choose(() => actions.markAvailable(pet))}
              />
            )}

            <Divider style={{ marginVertical: 6 }} />
            <SheetRow
              icon="trash-outline"
              label="Delete listing"
              destructive
              onPress={() => choose(() => actions.remove(pet, onDeleted))}
            />

            <Button label="Cancel" variant="neutral" radius={14} onPress={() => choose()} style={{ marginTop: 14 }} />
          </View>
        );
      }}
    </AdoptionSheet>
  );
}
