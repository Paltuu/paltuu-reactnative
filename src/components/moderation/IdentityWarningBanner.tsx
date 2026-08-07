import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { matchBadWordsIdentity } from '../../utils/moderation/badWords';

/**
 * Inline nudge for identity fields (display name, username, bio, pet
 * name/bio) — a soft warning only. Unlike a post/comment, these fields can't
 * be shadow-hidden (always fully public), so the server hard-rejects a
 * SEVERE match at save time; this banner just gives the user a heads-up
 * before they hit that wall. See lib/moderation/badWords.ts (Next.js) for
 * the full rationale.
 */
export const IdentityWarningBanner = ({ text }: { text: string }) => {
  const { severe, mild } = useMemo(() => matchBadWordsIdentity(text), [text]);
  if (severe.length === 0 && mild.length === 0) return null;
  return (
    <Text style={{ fontSize: 12, color: severe.length > 0 ? '#DC2626' : '#B45309', marginTop: 4 }}>
      {severe.length > 0
        ? "This won't be allowed to save — it looks like it includes offensive language."
        : 'This looks like it may include language some people find offensive.'}
    </Text>
  );
};
