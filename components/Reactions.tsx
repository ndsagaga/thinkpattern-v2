import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FNCap } from '@/components/fn/FNCap';
import { FNRule } from '@/components/fn/FNRule';
import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { fontFamily, fontSize, typography } from '@/constants/Typography';
import { useAuth } from '@/hooks/useAuth';
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useLikes,
  useToggleLike,
} from '@/hooks/useReactions';
import { supabase, type TargetType } from '@/lib/supabase';
import { formatRecency } from '@/utils/time';

const MAX_COMMENT = 500;

// Likes + comments footer for story and perspective details. Reading is open;
// liking and commenting route signed-out readers to /signin.
export function Reactions({ type, id }: { type: TargetType; id: string }) {
  if (!supabase) return null;
  return <ReactionsInner type={type} id={id} />;
}

function ReactionsInner({ type, id }: { type: TargetType; id: string }) {
  const { user } = useAuth();
  const likes = useLikes(type, id, user);
  const toggleLike = useToggleLike(type, id, user);
  const comments = useComments(type, id);
  const addComment = useAddComment(type, id, user);
  const deleteComment = useDeleteComment(type, id);
  const [draft, setDraft] = useState('');

  const liked = likes.data?.mine ?? false;
  const likeCount = likes.data?.count ?? 0;
  const list = comments.data ?? [];
  const body = draft.trim();

  const submit = () => {
    if (!body || addComment.isPending) return;
    addComment.mutate(body, { onSuccess: () => setDraft('') });
  };

  return (
    <View style={styles.wrap}>
      <FNRule style={styles.rule} />

      {user ? (
        <Pressable
          onPress={() => toggleLike.mutate(!liked)}
          style={styles.likeRow}
          accessibilityRole="button"
          accessibilityState={{ selected: liked }}
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
        >
          <Heart filled={liked} />
          <Text style={styles.likeLabel}>
            {liked ? 'Liked' : 'Like'} · <Text style={typography.num}>{likeCount}</Text>
          </Text>
        </Pressable>
      ) : (
        <Link href="/signin" asChild>
          <Pressable style={styles.likeRow} accessibilityRole="button" accessibilityLabel="Sign in to like">
            <Heart filled={false} />
            <Text style={styles.likeLabel}>
              Like · <Text style={typography.num}>{likeCount}</Text>
            </Text>
          </Pressable>
        </Link>
      )}

      <FNCap style={styles.section}>
        Comments · <Text style={typography.num}>{list.length}</Text>
      </FNCap>

      {list.length === 0 && !comments.isLoading ? (
        <Text style={styles.empty}>No comments yet.</Text>
      ) : null}

      {list.map((c, i) => (
        <View key={c.id} style={[styles.comment, i < list.length - 1 && styles.commentDivider]}>
          <View style={styles.commentMeta}>
            <Text style={styles.author}>{c.author_name}</Text>
            <FNCap>{formatRecency(c.created_at)}</FNCap>
          </View>
          <Text style={styles.body}>{c.body}</Text>
          {user?.id === c.user_id ? (
            <Pressable onPress={() => deleteComment.mutate(c.id)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {user ? (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={`Comment as ${user.name}`}
            placeholderTextColor={colors.muted}
            maxLength={MAX_COMMENT}
            multiline
            style={styles.input}
          />
          <Pressable
            onPress={submit}
            disabled={!body || addComment.isPending}
            style={[styles.button, (!body || addComment.isPending) && styles.buttonDisabled]}
            accessibilityRole="button"
          >
            <Text style={styles.buttonLabel}>{addComment.isPending ? 'Posting…' : 'Post'}</Text>
          </Pressable>
          {addComment.error ? <Text style={styles.error}>{addComment.error.message}</Text> : null}
        </View>
      ) : (
        <Link href="/signin" asChild>
          <Pressable style={styles.signInPrompt} accessibilityRole="button">
            <Text style={styles.signInLabel}>Sign in to like and comment →</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
        fill={filled ? colors.link : 'none'}
        stroke={filled ? colors.link : colors.ink2}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xxl },
  rule: { marginBottom: spacing.lg },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' },
  likeLabel: { fontFamily: fontFamily.uiMedium, fontSize: fontSize.base, color: colors.ink },
  section: { marginTop: spacing.xxl, marginBottom: spacing.sm },
  empty: { ...typography.body, color: colors.muted },
  comment: { paddingVertical: spacing.md },
  commentDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.faint },
  commentMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  author: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.detail, color: colors.ink },
  body: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.base, lineHeight: 22, color: colors.ink2, marginTop: spacing.xs },
  delete: { ...typography.cap, color: colors.link, marginTop: spacing.sm },
  composer: { marginTop: spacing.lg, gap: spacing.sm },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 4,
    padding: spacing.md,
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.base,
    color: colors.ink,
    backgroundColor: colors.paper2,
    textAlignVertical: 'top',
  },
  button: { alignSelf: 'flex-end', backgroundColor: colors.ink, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: 4 },
  buttonDisabled: { opacity: 0.4 },
  buttonLabel: { fontFamily: fontFamily.uiSemiBold, fontSize: fontSize.detail, color: colors.paper },
  error: { ...typography.body, color: colors.link },
  signInPrompt: { marginTop: spacing.lg, alignSelf: 'flex-start' },
  signInLabel: { fontFamily: fontFamily.uiSemiBold, fontSize: fontSize.base, color: colors.link },
});
