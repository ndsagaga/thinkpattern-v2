import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase, type TargetType } from '@/lib/supabase';
import type { AuthUser } from './useAuth';

export type Comment = {
  id: number;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

type Likes = { count: number; mine: boolean };

const likesKey = (type: TargetType, id: string, userId: string | undefined) =>
  ['reactions', 'likes', type, id, userId ?? 'anon'] as const;
const commentsKey = (type: TargetType, id: string) => ['reactions', 'comments', type, id] as const;

// Reactions are live social data: never served from the persisted cache.
const live = { staleTime: 0, meta: { noPersist: true } };

export function useLikes(type: TargetType, id: string, user: AuthUser | null) {
  return useQuery({
    queryKey: likesKey(type, id, user?.id),
    enabled: !!supabase,
    ...live,
    queryFn: async (): Promise<Likes> => {
      const { data, error } = await supabase!
        .from('likes')
        .select('user_id')
        .eq('target_type', type)
        .eq('target_id', id);
      if (error) throw error;
      return { count: data.length, mine: !!user && data.some((r) => r.user_id === user.id) };
    },
  });
}

export function useToggleLike(type: TargetType, id: string, user: AuthUser | null) {
  const qc = useQueryClient();
  const key = likesKey(type, id, user?.id);
  return useMutation({
    mutationFn: async (like: boolean) => {
      const q = supabase!.from('likes');
      const { error } = like
        ? await q.insert({ target_type: type, target_id: id })
        : await q.delete().eq('target_type', type).eq('target_id', id).eq('user_id', user!.id);
      if (error) throw error;
    },
    onMutate: (like) => {
      const prev = qc.getQueryData<Likes>(key);
      if (prev) qc.setQueryData<Likes>(key, { count: prev.count + (like ? 1 : -1), mine: like });
      qc.setQueryData<Map<string, ReactionCounts>>(countsKey(type, user?.id), (m) => {
        if (!m) return m;
        const next = new Map(m);
        const c = next.get(id) ?? { likes: 0, comments: 0, mine: false };
        next.set(id, { ...c, likes: c.likes + (like ? 1 : -1), mine: like });
        return next;
      });
      return { prev };
    },
    onError: (_e, _like, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['reactions', 'counts', type] });
    },
  });
}

export function useComments(type: TargetType, id: string) {
  return useQuery({
    queryKey: commentsKey(type, id),
    enabled: !!supabase,
    ...live,
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await supabase!
        .from('comments')
        .select('id, user_id, author_name, body, created_at')
        .eq('target_type', type)
        .eq('target_id', id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddComment(type: TargetType, id: string, user: AuthUser | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase!
        .from('comments')
        .insert({ target_type: type, target_id: id, author_name: user!.name, body });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsKey(type, id) });
      qc.invalidateQueries({ queryKey: ['reactions', 'counts', type] });
    },
  });
}

export function useDeleteComment(type: TargetType, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: number) => {
      const { error } = await supabase!.from('comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsKey(type, id) });
      qc.invalidateQueries({ queryKey: ['reactions', 'counts', type] });
    },
  });
}

export type ReactionCounts = { likes: number; comments: number; mine: boolean };

const countsKey = (type: TargetType, userId: string | undefined) =>
  ['reactions', 'counts', type, userId ?? 'anon'] as const;

// Like + comment counts (and whether the current user liked) for every item of
// a type, in one round trip each — shared by all feed cards via the cache.
export function useReactionCounts(type: TargetType, user: AuthUser | null) {
  return useQuery({
    queryKey: countsKey(type, user?.id),
    enabled: !!supabase,
    staleTime: 30_000,
    meta: { noPersist: true },
    queryFn: async (): Promise<Map<string, ReactionCounts>> => {
      const [likes, comments] = await Promise.all([
        supabase!.from('likes').select('target_id, user_id').eq('target_type', type),
        supabase!.from('comments').select('target_id').eq('target_type', type),
      ]);
      if (likes.error) throw likes.error;
      if (comments.error) throw comments.error;
      const counts = new Map<string, ReactionCounts>();
      const entry = (id: string) => {
        const c = counts.get(id) ?? { likes: 0, comments: 0, mine: false };
        counts.set(id, c);
        return c;
      };
      likes.data.forEach((r) => {
        const c = entry(r.target_id);
        c.likes += 1;
        if (user && r.user_id === user.id) c.mine = true;
      });
      comments.data.forEach((r) => {
        entry(r.target_id).comments += 1;
      });
      return counts;
    },
  });
}
