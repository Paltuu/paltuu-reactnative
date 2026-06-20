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
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useMentions } from 'react-native-controlled-mentions';
import type { TriggersConfig, SuggestionsProvidedProps, Suggestion } from 'react-native-controlled-mentions';
import { useQuery } from '@tanstack/react-query';
import { socialApi, type MentionSuggestionPet, type MentionSuggestionUser } from '../../api/social';
import { useDebounce } from '../../hooks/useDebounce';

const PRIMARY = '#a03048';

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

    return { triggers, textInputProps };
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
 * The "@" suggestion dropdown — your pets first, then suggested people,
 * exactly matching what `GET /social/mentions/suggest` returns. Renders as a
 * lightweight inline card (not a bottom sheet) so it never interrupts typing.
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

    if (!isLoading && pets.length === 0 && users.length === 0) return null;

    type Row =
        | { kind: 'pet'; pet: MentionSuggestionPet }
        | { kind: 'user'; user: MentionSuggestionUser };

    const rows: Row[] = [
        ...pets.map((pet) => ({ kind: 'pet' as const, pet })),
        ...users.map((user) => ({ kind: 'user' as const, user })),
    ];

    const handleSelect = (suggestion: Suggestion) => onSelect(suggestion);

    return (
        <View
            style={{
                backgroundColor: '#fff',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                maxHeight: 260,
                marginTop: 6,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
                overflow: 'hidden',
            }}
        >
            {isLoading && rows.length === 0 ? (
                <View style={{ padding: 14, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={PRIMARY} />
                </View>
            ) : (
                <FlatList
                    data={rows}
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={(row) =>
                        row.kind === 'pet' ? `pet:${row.pet.pet_profile_id}` : `user:${row.user.user_id}`
                    }
                    renderItem={({ item: row }) => {
                        if (row.kind === 'pet') {
                            const { pet } = row;
                            return (
                                <TouchableOpacity
                                    onPress={() =>
                                        handleSelect({ id: `pet:${pet.pet_profile_id}`, name: pet.name })
                                    }
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9 }}
                                >
                                    <Avatar uri={pet.avatar_url} emoji={PET_EMOJI[pet.species?.toLowerCase()] ?? PET_EMOJI.default} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111' }}>{pet.name}</Text>
                                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Your pet · {pet.species}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }

                        const { user } = row;
                        return (
                            <TouchableOpacity
                                onPress={() =>
                                    handleSelect({ id: `user:${user.user_id}`, name: user.social_username || '' })
                                }
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9 }}
                            >
                                <Avatar uri={user.profile_image_url} fallbackText={initialsFor(user.name)} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111' }}>
                                        {user.social_username ? `@${user.social_username}` : user.name}
                                    </Text>
                                    {!!user.social_username && (
                                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{user.name}</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </View>
    );
}
