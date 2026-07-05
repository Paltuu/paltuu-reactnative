// Shared @mention composer pieces, used by both the post composer
// (app/create-post.tsx) and the comment/reply composer (CommentComposer.tsx).
//
// Wraps `react-native-controlled-mentions`' `useMentions` hook around a
// single '@' trigger. The hook keeps the controlled `value` string in its
// native wire format the whole time — e.g. typing "Hey @Bella" and selecting
// the pet "Bella" (pet_profile_id 42) makes `value` become
// "Hey {@}[Bella](pet:42)" while the TextInput visually shows "Hey @Bella"
// (the library renders styled Text children inside the TextInput). There is
// no separate "clean display text" vs "encoded value" to convert between —
// `value` IS the string that gets sent to the API as `content`, and it's
// also exactly what should be used to pre-fill an edit-mode TextInput
// directly from a stored post/comment's content.
//
// We pack our own "type:numericId" convention into the library's opaque
// `id` slot (e.g. id "pet:42" or "user:7") since the library only tracks a
// single id per mention, not a separate type field — see lib/mentions.ts on
// the backend, which parses this exact wire format.
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useMentions } from 'react-native-controlled-mentions';
import type { TriggersConfig, SuggestionsProvidedProps, Suggestion } from 'react-native-controlled-mentions';
import { useQuery } from '@tanstack/react-query';
import { socialApi, type MentionSuggestionPet, type MentionSuggestionUser } from '../../api/social';
import { useDebounce } from '../../hooks/useDebounce';

const PRIMARY = '#a03048';
const SHEET_BG = '#fff';

type MentionTriggerName = 'mention';

/**
 * Wraps `useMentions` with our single '@' trigger config. Spread
 * `textInputProps` onto the existing `<TextInput>` and render
 * `<MentionSuggestionDropdown {...triggers.mention} />` near it.
 *
 * `allowedSpacesCount` is set above the library's default (0) because pet
 * names on this platform are NOT required to be unique and can contain
 * spaces (e.g. "Mr Fluffy") — without this, the keyword search would cut
 * off at the first space while a user is still typing a multi-word search.
 */
export function useMentionInput({
    value,
    onChange,
}: {
    value: string;
    onChange: (text: string) => void;
}) {
    const triggersConfig: TriggersConfig<MentionTriggerName> = useMemo(
        () => ({
            mention: {
                trigger: '@',
                allowedSpacesCount: 3,
                isInsertSpaceAfterMention: true,
                textStyle: { fontWeight: '700', color: PRIMARY },
            },
        }),
        []
    );

    const { triggers, textInputProps } = useMentions<MentionTriggerName>({
        value,
        onChange,
        triggersConfig,
    });

    // On Android, TextInput with `children` (used by the library for styled
    // mention rendering) becomes non-editable. Strip children and use `value`
    // directly so the keyboard works. Mentions still parse/insert correctly —
    // they just won't show inline highlight colour on Android.
    const { children: _mentionChildren, ...textInputPropsBase } = textInputProps as any;
    const safeTextInputProps = Platform.OS === 'android'
        ? { ...textInputPropsBase, value }
        : textInputProps;

    return { triggers, textInputProps: safeTextInputProps };
}

/** Programmatic mention insert (e.g. for the reply-to-comment prefill) — splices
 *  a mention token at the end of the current value, matching the library's own
 *  wire format, followed by a trailing space. */
export function appendMention(
    value: string,
    mention: { type: 'user' | 'pet'; id: number; name: string }
): string {
    const separator = value.length > 0 && !value.endsWith(' ') ? ' ' : '';
    return `${value}${separator}{@}[${mention.name}](${mention.type}:${mention.id}) `;
}

const initialsFor = (name?: string) =>
    (name || '?')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

const PET_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶', bird: '🐦', default: '🐾' };

const Avatar = ({ uri, fallbackText, emoji, size = 36 }: { uri?: string | null; fallbackText?: string; emoji?: string; size?: number }) => {
    if (uri) {
        return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
    }
    return (
        <View
            style={{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: '#fdf0f2', alignItems: 'center', justifyContent: 'center',
            }}
        >
            {emoji ? (
                <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
            ) : (
                <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: PRIMARY }}>{fallbackText}</Text>
            )}
        </View>
    );
};

/**
 * The "@" suggestion list — your pets first, then suggested people, exactly
 * matching what `GET /social/mentions/suggest` returns. Renders full-width,
 * edge-to-edge (no card/shadow/rounded corners) so that when the host screen
 * gives this component `flex: 1` directly below the input, it fills all
 * remaining space down to the keyboard — matching the in-app @mention UX.
 *
 * Selecting a row calls the library's `onSelect`, which is what actually
 * splices the `{@}[name](id)` token into `value` — this component never
 * touches the TextInput's value directly.
 */
export function MentionSuggestionDropdown({ keyword, onSelect }: SuggestionsProvidedProps) {
    const debouncedKeyword = useDebounce(keyword, 250);
    const isActive = keyword !== undefined;

    const { data, isLoading } = useQuery({
        queryKey: ['mention-suggest', debouncedKeyword],
        queryFn: () => socialApi.suggestMentions(debouncedKeyword || ''),
        enabled: isActive,
        staleTime: 10_000,
    });

    if (!isActive) return null;

    const pets = data?.pets ?? [];
    const users = data?.users ?? [];

    type Row =
        | { kind: 'pet'; pet: MentionSuggestionPet }
        | { kind: 'user'; user: MentionSuggestionUser };

    const rows: Row[] = [
        ...pets.map((pet) => ({ kind: 'pet' as const, pet })),
        ...users.map((user) => ({ kind: 'user' as const, user })),
    ];

    const handleSelect = (suggestion: Suggestion) => onSelect(suggestion);

    if (isLoading && rows.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: SHEET_BG, paddingTop: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={PRIMARY} />
            </View>
        );
    }

    if (rows.length === 0) {
        return <View style={{ flex: 1, backgroundColor: SHEET_BG }} />;
    }

    return (
        <FlatList
            data={rows}
            style={{ flex: 1, backgroundColor: SHEET_BG }}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(row) =>
                row.kind === 'pet' ? `pet:${row.pet.pet_profile_id}` : `user:${row.user.user_id}`
            }
            ItemSeparatorComponent={() => (
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginLeft: 16 + 36 + 12 }} />
            )}
            renderItem={({ item: row }) => {
                if (row.kind === 'pet') {
                    const { pet } = row;
                    return (
                        <TouchableOpacity
                            onPress={() => handleSelect({ id: `pet:${pet.pet_profile_id}`, name: pet.name })}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}
                        >
                            <Avatar uri={pet.avatar_url} emoji={PET_EMOJI[pet.species?.toLowerCase()] ?? PET_EMOJI.default} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#111' }}>{pet.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                    <Ionicons name="paw" size={11} color="#9CA3AF" />
                                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Your pet · {pet.species}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }

                const { user } = row;
                return (
                    <TouchableOpacity
                        onPress={() => handleSelect({ id: `user:${user.user_id}`, name: user.social_username || '' })}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}
                    >
                        <Avatar uri={user.profile_image_url} fallbackText={initialsFor(user.name)} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#111' }}>{user.name}</Text>
                            <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 1 }}>@{user.social_username}</Text>
                            {user.is_following && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <Ionicons name="person" size={11} color="#9CA3AF" />
                                    <Text style={{ fontSize: 11.5, color: '#9CA3AF' }}>Following</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                );
            }}
        />
    );
}
