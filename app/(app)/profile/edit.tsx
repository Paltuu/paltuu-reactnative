import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useAuthStore } from '../../../src/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../../src/api/social';
import client from '../../../src/api/client';
import { Avatar } from '../../../src/components/common/Avatar';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';

const DS = {
  primary: '#A03048',
  link: '#3B82F6',
  dark: '#111111',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  border: '#EDEEF0',
  bg: '#FFFFFF',
};

const AVATAR_SIZE = 92;
const USERNAME_REGEX = /^[a-z0-9_.]{1,30}$/;

// ── Reusable list row (Instagram edit-profile style) ─────────────────────────
// Defined at module scope (never re-created between renders) so the embedded
// TextInput keeps focus across keystrokes — an inline row component would remount
// on every parent state change and drop the keyboard after one character.
function FieldRow({
  label,
  children,
  multiline = false,
}: {
  label: string;
  children: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <View style={[s.row, multiline && s.rowMultiline]}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.rowValue}>{children}</View>
    </View>
  );
}

function clientValidateUsername(handle: string): string | null {
  if (handle.length === 0) return 'Username cannot be empty';
  if (handle.length > 30) return 'Max 30 characters';
  if (!USERNAME_REGEX.test(handle)) return 'Letters, numbers, _ and . only';
  if (handle.startsWith('.')) return 'Cannot start with a period';
  if (handle.endsWith('.')) return 'Cannot end with a period';
  if (handle.includes('..')) return 'Cannot contain consecutive periods';
  return null;
}

function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const { data: profileData } = useQuery({
    queryKey: ['social-profile', userId],
    queryFn: () => socialApi.getProfile(userId!),
    enabled: !!userId,
  });

  const profile = profileData?.profile;
  const originalUsername = (profile?.social_username || profile?.username || '').toLowerCase();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null); // freshly picked, not yet saved
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // ── Hydrate once from the loaded profile ──────────────────────────────────
  useEffect(() => {
    if (profile && !hydrated) {
      setName(profile.name || '');
      setUsername((profile.social_username || profile.username || '').toLowerCase());
      setBio(profile.bio || '');
      setHydrated(true);
    }
  }, [profile, hydrated]);

  // ── Username availability check (debounced) ───────────────────────────────
  const [debouncedUsername, setDebouncedUsername] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const usernameFormatError = clientValidateUsername(username);
  const usernameUnchanged = username === originalUsername;
  const needsCheck = !usernameFormatError && !usernameUnchanged;

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!needsCheck) {
      setDebouncedUsername('');
      return;
    }
    debounceTimer.current = setTimeout(() => setDebouncedUsername(username), 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [username, needsCheck]);

  const {
    data: checkResult,
    isFetching: isChecking,
    isError: checkFailed,
  } = useQuery({
    queryKey: ['username-check', debouncedUsername],
    queryFn: () => socialApi.checkUsername(debouncedUsername),
    enabled: debouncedUsername.length > 0,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const isCheckPending = needsCheck && (debouncedUsername !== username || isChecking);
  const isAvailable = checkResult?.valid && checkResult?.available;
  const usernameOk =
    !usernameFormatError && (usernameUnchanged || (!isCheckPending && isAvailable === true));

  const usernameHint = useMemo((): { text: string; color: string } | null => {
    if (usernameUnchanged) return null;
    if (usernameFormatError) return { text: usernameFormatError, color: '#EF4444' };
    if (isCheckPending) return { text: `Checking @${username}…`, color: DS.gray500 };
    if (checkFailed) return { text: 'Could not verify — try again', color: '#F59E0B' };
    if (isAvailable === true) return { text: `@${username} is available!`, color: '#10B981' };
    if (isAvailable === false) return { text: `@${username} is already taken`, color: '#EF4444' };
    return null;
  }, [usernameUnchanged, usernameFormatError, isCheckPending, checkFailed, isAvailable, username]);

  // ── Avatar pick + circular (square 1:1) crop + upload ─────────────────────
  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // force the built-in crop UI
      aspect: [1, 1], // always a square crop so it fits the circular avatar
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    // Guarantee a centered square regardless of what the crop UI returned, then
    // downscale — the avatar is always displayed inside a circle mask.
    const side = Math.min(asset.width ?? 0, asset.height ?? 0);
    const cropped = side
      ? await manipulateAsync(
          asset.uri,
          [
            {
              crop: {
                originX: Math.floor(((asset.width ?? side) - side) / 2),
                originY: Math.floor(((asset.height ?? side) - side) / 2),
                width: side,
                height: side,
              },
            },
            { resize: { width: 512, height: 512 } },
          ],
          { compress: 0.85, format: SaveFormat.JPEG }
        )
      : { uri: asset.uri };

    setAvatarUri(cropped.uri);
    uploadAvatar(cropped.uri);
  };

  const uploadAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri, name: 'profile.jpg', type: 'image/jpeg' } as any);
      await client.post('/social/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
    } catch {
      setAvatarUri(null);
      Alert.alert('Upload failed', 'Could not update your photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (payload: any) => socialApi.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error?.message || 'Failed to update profile.');
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Display name cannot be empty.');
      return;
    }
    if (!usernameOk) {
      Alert.alert('Username unavailable', usernameHint?.text || 'Please pick a valid, available username.');
      return;
    }
    // Only send social_username when the handle actually changed — re-sending the
    // user's own (possibly reserved/legacy) handle makes the update endpoint reject
    // it as "reserved"/"taken".
    updateMutation.mutate({
      name: name.trim(),
      bio: bio.trim(),
      ...(usernameUnchanged ? {} : { social_username: username.trim().toLowerCase() }),
    });
  };

  const canSave = hydrated && name.trim().length > 0 && usernameOk && !updateMutation.isPending;

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={s.headerSide}>
          <Ionicons name="chevron-back" size={26} color={DS.dark} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          hitSlop={12}
          style={s.headerSide}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color={DS.primary} />
          ) : (
            <Text style={[s.saveText, !canSave && s.saveTextDisabled]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar ── */}
          <View style={s.avatarBlock}>
            <TouchableOpacity activeOpacity={0.85} onPress={pickAvatar} style={{ position: 'relative' }}>
              <Avatar uri={avatarUri || profile?.profile_image_url} size={AVATAR_SIZE} />
              {uploadingAvatar && (
                <View style={s.avatarOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={pickAvatar} hitSlop={8}>
              <Text style={s.editPicText}>Edit picture or avatar</Text>
            </TouchableOpacity>
          </View>

          {/* ── Fields ── */}
          <View style={s.rows}>
            <FieldRow label="Name">
              <TextInput
                value={name}
                onChangeText={setName}
                style={s.input}
                placeholder="Name"
                placeholderTextColor={DS.gray400}
                maxLength={60}
                autoCorrect={false}
                returnKeyType="next"
              />
            </FieldRow>

            <FieldRow label="Username">
              <View style={s.usernameRow}>
                <Text style={s.at}>@</Text>
                <TextInput
                  value={username}
                  onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase())}
                  style={[s.input, { flex: 1 }]}
                  placeholder="username"
                  placeholderTextColor={DS.gray400}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                  returnKeyType="next"
                />
                {!usernameUnchanged && isCheckPending && (
                  <ActivityIndicator size="small" color={DS.primary} />
                )}
                {!usernameUnchanged && !isCheckPending && isAvailable === true && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
                {!usernameUnchanged && !isCheckPending && (usernameFormatError || isAvailable === false) && (
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                )}
              </View>
            </FieldRow>
            {usernameHint && (
              <Text style={[s.hint, { color: usernameHint.color }]}>{usernameHint.text}</Text>
            )}

            <FieldRow label="Bio" multiline>
              <TextInput
                value={bio}
                onChangeText={setBio}
                style={[s.input, s.inputMultiline]}
                placeholder="Write a little about yourself or your pets…"
                placeholderTextColor={DS.gray400}
                multiline
                maxLength={200}
                textAlignVertical="top"
              />
            </FieldRow>
            {bio.length > 0 && <Text style={s.charCount}>{bio.length}/200</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.border,
  },
  headerSide: { minWidth: 60, height: 44, justifyContent: 'center' },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: DS.dark,
  },
  saveText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: DS.primary,
    textAlign: 'right',
  },
  saveTextDisabled: { color: DS.gray400 },

  scrollContent: { paddingBottom: 60 },

  // Avatar
  avatarBlock: { alignItems: 'center', paddingTop: 24, paddingBottom: 20, gap: 12 },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPicText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: DS.primary,
  },

  // Rows
  rows: { paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.border,
  },
  rowMultiline: { alignItems: 'flex-start', paddingTop: 16 },
  rowLabel: {
    width: 92,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: DS.dark,
  },
  rowValue: { flex: 1 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  at: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: DS.gray500,
  },
  input: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: DS.dark,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  inputMultiline: {
    minHeight: 72,
    paddingTop: 0,
    lineHeight: 20,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginLeft: 92,
    marginTop: 6,
    marginBottom: 2,
  },
  charCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: DS.gray400,
    textAlign: 'right',
    marginTop: 6,
  },
});

export default withFocusUnmount(EditProfileScreen);
