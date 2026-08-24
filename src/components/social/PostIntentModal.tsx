import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/* ── Post-intent modals ──
 * Three Day-One-styled popups (see DayOneClaimModal — same centered white
 * rounded card, icon over title over body over full-width action) covering
 * the two regex checks in utils/moderation/postIntent.ts:
 *
 *   PetSaleWarningModal  — compose time, blocking-ish. The caption reads as
 *     a buying/selling post, which Paltuu doesn't allow. Two ways out:
 *     back to editing (primary, the one we want taken) or post anyway.
 *   AdoptionNudgeModal   — compose time, purely a suggestion. The caption
 *     reads as a rehoming post, and the Adopt section is a better home for
 *     it, so offer to take them there.
 *   PetSalePolicyModal   — read time, for everyone. Opened by tapping the
 *     public flag banner on a post already tagged `pet_sale`.
 *
 * All three are presentational: no detection, no navigation, no posting —
 * the caller owns all of that.
 */

const PRIMARY = '#a03048';

/** Shared shell so the three stay visually identical to DayOneClaimModal. */
const IntentModalShell = ({
  visible,
  onRequestClose,
  iconName,
  iconColor,
  iconBg,
  title,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onRequestClose}
    statusBarTranslucent
    navigationBarTranslucent
  >
    <View className="flex-1 bg-black/50 justify-center items-center px-8">
      <View className="w-full bg-white p-6 items-center rounded-2xl">
        <View
          className="w-14 h-14 rounded-full items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons name={iconName} size={30} color={iconColor} />
        </View>
        <Text className="mt-4 text-lg font-bold text-[#111] text-center">{title}</Text>
        {children}
      </View>
    </View>
  </Modal>
);

/* ── Compose time: caption reads as a pet sale ── */
export const PetSaleWarningModal = ({
  visible,
  onEdit,
  onPostAnyway,
}: {
  visible: boolean;
  /** Dismiss and return to the composer with the caption intact. */
  onEdit: () => void;
  /** Post regardless — the server will still flag it on create. */
  onPostAnyway: () => void;
}) => (
  <IntentModalShell
    visible={visible}
    onRequestClose={onEdit}
    iconName="alert-circle"
    iconColor="#fff"
    iconBg={PRIMARY}
    title="This looks like a sale post"
  >
    <Text className="mt-2 text-sm text-gray-600 text-center leading-5">
      Buying and selling pets is against our policy. Post this and it gets flagged
      publicly on your post right away, and taken down once a moderator confirms it.
      {"\n\n"}
      Rehoming instead? Say so without a price, or list the pet in Adopt.
    </Text>
    <TouchableOpacity
      className="mt-5 w-full bg-primary py-3.5 rounded-xl items-center"
      onPress={onEdit}
    >
      <Text className="text-white font-bold">Edit my post</Text>
    </TouchableOpacity>
    <TouchableOpacity className="mt-3 py-1" onPress={onPostAnyway} hitSlop={8}>
      <Text className="text-sm text-gray-500 font-semibold">Post anyway</Text>
    </TouchableOpacity>
  </IntentModalShell>
);

/* ── Compose time: caption reads as a rehoming/adoption post ── */
export const AdoptionNudgeModal = ({
  visible,
  onGoToAdopt,
  onPostAnyway,
}: {
  visible: boolean;
  /** Leave the composer for the Adopt listing flow. */
  onGoToAdopt: () => void;
  /** Keep it as a social post. */
  onPostAnyway: () => void;
}) => (
  <IntentModalShell
    visible={visible}
    onRequestClose={onPostAnyway}
    iconName="home"
    iconColor={PRIMARY}
    iconBg="#fce8ed"
    title="Post this in Adopt instead?"
  >
    <Text className="mt-2 text-sm text-gray-600 text-center leading-5">
      Adoption listings get seen by everyone browsing Adopt on the web and in the
      app — not just the people who follow you. You also get proper fields for age,
      breed, location and vaccination, plus adoption requests straight to your inbox.
    </Text>
    <TouchableOpacity
      className="mt-5 w-full bg-primary py-3.5 rounded-xl items-center"
      onPress={onGoToAdopt}
    >
      <Text className="text-white font-bold">List in Adopt</Text>
    </TouchableOpacity>
    <TouchableOpacity className="mt-3 py-1" onPress={onPostAnyway} hitSlop={8}>
      <Text className="text-sm text-gray-500 font-semibold">Post here anyway</Text>
    </TouchableOpacity>
  </IntentModalShell>
);

/* ── Read time: what the public flag banner on a post means ── */
export const PetSalePolicyModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => (
  <IntentModalShell
    visible={visible}
    onRequestClose={onClose}
    iconName="alert-circle"
    iconColor="#fff"
    iconBg={PRIMARY}
    title="Flagged as a sale post"
  >
    <Text className="mt-2 text-sm text-gray-600 text-center leading-5">
      This post was automatically marked as buying or selling a pet. Paltuu does not
      condone it — pets are not merchandise, and we only support adoption and
      rehoming.
      {"\n\n"}
      It's under review and will be removed if a moderator confirms it. Automatic
      detection isn't perfect, so this can be wrong.
    </Text>
    <TouchableOpacity
      className="mt-5 w-full bg-primary py-3.5 rounded-xl items-center"
      onPress={onClose}
    >
      <Text className="text-white font-bold">Got it</Text>
    </TouchableOpacity>
  </IntentModalShell>
);
