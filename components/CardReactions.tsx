import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { CommentIcon, HeartIcon } from '@/components/ReactionIcons';
import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { fontSize, typography } from '@/constants/Typography';
import { useAuth } from '@/hooks/useAuth';
import { useReactionCounts, useToggleLike } from '@/hooks/useReactions';
import { supabase, type TargetType } from '@/lib/supabase';

// Like + comment buttons on a feed card. Like toggles in place (signed-out →
// /signin); comment opens the detail scrolled to its comments. Imperative
// router because the card itself is already a <Link> — a nested Link would
// nest anchors on web.
export function CardReactions({ type, id }: { type: TargetType; id: string }) {
  if (!supabase) return null;
  return <CardReactionsInner type={type} id={id} />;
}

function CardReactionsInner({ type, id }: { type: TargetType; id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const counts = useReactionCounts(type, user).data?.get(id);
  const toggleLike = useToggleLike(type, id, user);
  const liked = counts?.mine ?? false;

  // The card's own <Link> sits around these buttons; keep the tap here.
  const own = (e: GestureResponderEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  const onLike = (e: GestureResponderEvent) => {
    own(e);
    if (!user) router.push('/signin');
    else toggleLike.mutate(!liked);
  };
  const onComment = (e: GestureResponderEvent) => {
    own(e);
    router.push({ pathname: type === 'story' ? '/story/[id]' : '/perspective/[id]', params: { id, focus: 'comments' } });
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onLike}
        style={({ pressed }) => [styles.button, liked && styles.buttonOn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ selected: liked }}
        accessibilityLabel={liked ? 'Unlike' : 'Like'}
      >
        <HeartIcon filled={liked} size={15} />
        <Text style={[styles.label, liked && styles.on]}>{liked ? 'Liked' : 'Like'}</Text>
        <Text style={[styles.count, liked && styles.on]}>{counts?.likes ?? 0}</Text>
      </Pressable>
      <Pressable
        onPress={onComment}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Comments"
      >
        <CommentIcon size={15} />
        <Text style={styles.label}>Comment</Text>
        <Text style={styles.count}>{counts?.comments ?? 0}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.paper2,
  },
  buttonOn: { backgroundColor: `${colors.link}1f` },
  pressed: { opacity: 0.7 },
  label: { ...typography.cap, color: colors.ink2 },
  count: { ...typography.num, fontSize: fontSize.fine, color: colors.muted },
  on: { color: colors.link },
});
