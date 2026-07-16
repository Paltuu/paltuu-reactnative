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
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Platform
} from 'react-native';
import type { TextInputProps } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useMentions } from 'react-native-controlled-mentions';
import type { TriggersConfig, SuggestionsProvidedProps, Suggestion, Part } from 'react-native-controlled-mentions';
import { useQuery } from '@tanstack/react-query';
import { socialApi, type MentionSuggestionPet, type MentionSuggestionUser } from '../../api/social';
import { useDebounce } from '../../hooks/useDebounce';
import { NO_PROFILE_IMAGE } from '../../constants/images';

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

    const { triggers, textInputProps, mentionState } = useMentions<MentionTriggerName>({
        value,
        onChange,
        triggersConfig,
    });

    // On Android, TextInput with `children` (used by the library for styled
    // mention rendering) becomes non-editable. Strip children and drive
    // `value` ourselves instead — but with `mentionState.plainText`, NOT the
    // raw encoded `value`. `children` on iOS is built from the same
    // `mentionState.parts[].text` that makes up `plainText` (each mention
    // part renders as its decoded "@name", not the wire-format token — see
    // getTriggerPlainString in the library), so plainText is exactly what iOS
    // visually shows there. It's also exactly what `onChangeText`
    // (handleTextChange) expects to diff incoming text against before
    // re-encoding — feeding it the raw encoded value instead showed the raw
    // `{@}[name](type:id)` token in the box and corrupted the mention into
    // plain text on the next edit.
    const { children: _mentionChildren, ...textInputPropsBase } = textInputProps as any;
    const safeTextInputProps = Platform.OS === 'android'
        ? { ...textInputPropsBase, value: mentionState.plainText }
        : textInputProps;

    const keyword = triggers.mention.keyword;

    // `allowedSpacesCount: 3` above only keeps the *keyword itself* alive
    // across spaces so multi-word pet names ("Mr Fluffy") can still be typed
    // and matched by `MentionSuggestionDropdown`'s own search. The dropdown's
    // visibility is separate: a username never contains a space, so as soon
    // as the user types one, close the dropdown immediately rather than
    // waiting for allowedSpacesCount to run out.
    const mentionActive = keyword !== undefined && !keyword.includes(' ');

    return { triggers, textInputProps: safeTextInputProps, mentionState, mentionActive };
}

type MentionStateLike = { plainText: string; parts: Part[] };

/**
 * Drop-in replacement for `<TextInput {...mentionInputProps} />` that also
 * live-highlights mentions in red WHILE TYPING on Android, matching iOS
 * (which gets this for free from the library's `children` rendering — see
 * useMentionInput above) and matching what native apps like Instagram do
 * with Android's Spannable text, which RN's TextInput has no equivalent for.
 *
 * Since `children` breaks Android's TextInput editability, we can't color
 * the real input's own text. Instead this stacks two views on Android: the
 * real `TextInput` underneath with its text made transparent (so it still
 * owns typing/cursor/keyboard/selection — nothing about editing changes),
 * and a non-interactive, styled `Text` overlay on top that mirrors the same
 * content with mention parts colored. `onScroll` keeps the overlay's
 * vertical position synced to the real input whenever it internally scrolls
 * (e.g. a maxHeight-capped composer once text overflows it).
 */
export const MentionInputField = React.forwardRef<TextInput, TextInputProps & {
    textInputProps: any;
    mentionState: MentionStateLike;
}>(({ textInputProps, mentionState, style, ...rest }, ref) => {
    const [scrollY, setScrollY] = useState(0);

    if (Platform.OS !== 'android') {
        return <TextInput ref={ref} {...textInputProps} {...rest} style={style} />;
    }

    return (
        <View style={{ position: 'relative' }}>
            <TextInput
                ref={ref}
                {...textInputProps}
                {...rest}
                style={[style, { color: 'transparent' }]}
                onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
                scrollEventThrottle={16}
            />
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                <Text style={[style, { transform: [{ translateY: -scrollY }] }]}>
                    {mentionState.parts.map((part, index) => (
                        <Text
                            key={index}
                            style={
                                part.config
                                    ? (typeof part.config.textStyle === 'function'
                                        ? part.config.textStyle(part.data)
                                        : part.config.textStyle)
                                    : undefined
                            }
                        >
                            {part.text}
                        </Text>
                    ))}
                </Text>
            </View>
        </View>
    );
});
MentionInputField.displayName = 'MentionInputField';

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

const PET_EMOJI: Record<string, string> = { cat: '🐱', dog: '🐶', bird: '🐦', default: '🐾' };

const Avatar = ({ uri, emoji, size = 36 }: { uri?: string | null; emoji?: string; size?: number }) => {
    if (uri) {
        return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
    }
    // Pets fall back to a species emoji; people fall back to the shared no-profile image.
    if (!emoji) {
        return <Image source={NO_PROFILE_IMAGE} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
    }
    return (
        <View
            style={{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: '#fdf0f2', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
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
                        <Avatar uri={user.profile_image_url} />
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
