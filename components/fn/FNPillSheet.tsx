import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/theme';
import { FRAUNCES_LEADING, fontFamily, fontSize } from '@/constants/Typography';
import {
  PILL_LIMITS,
  addPill,
  defaultPillName,
  isValidDraft,
  normalizeKeyword,
  removePill,
  updatePill,
  type CustomPill,
} from '@/lib/customPills';
import { emit } from '@/lib/events';
import { compilePill, matchRange, storyMatches } from '@/lib/pillMatch';
import type { StoryIndexEntry } from '@/types/contract';
import { formatRecency } from '@/utils/time';
import { FNCap } from './FNCap';

export type FNPillSheetHandle = {
  openCreate: () => void;
  openEdit: (pill: CustomPill) => void;
};

type Props = {
  // The feed the pill will filter — drives the live "Matches now" preview.
  stories: StoryIndexEntry[];
  // A pill was created; the host selects it so the reader lands on its feed.
  onCreated: (pill: CustomPill) => void;
};

const PREVIEW_ROWS = 3;

// `list` plus `raw`, if it normalizes to a new keyword and there is room.
function withKeyword(list: string[], raw: string): string[] {
  const keyword = normalizeKeyword(raw);
  return keyword && !list.includes(keyword) && list.length < PILL_LIMITS.keywords ? [...list, keyword] : list;
}

// Create / edit a custom pill — one sheet, two modes (design/ThinkPattern
// `PillSheet`). Keywords are chips, committed with return; the match count
// recounts on commit, not per keystroke. A keyword still in the field when the
// reader taps Save is included. Sheet chrome mirrors FNAllSourcesSheet.
export const FNPillSheet = forwardRef<FNPillSheetHandle, Props>(function FNPillSheet(
  { stories, onCreated },
  ref,
) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['88%'], []);

  const [editing, setEditing] = useState<CustomPill | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [name, setName] = useState('');

  const reset = (pill: CustomPill | null) => {
    setEditing(pill);
    setKeywords(pill?.keywords ?? []);
    setDraft('');
    setName(pill?.name ?? '');
  };

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      reset(null);
      sheetRef.current?.present();
    },
    openEdit: (pill) => {
      reset(pill);
      sheetRef.current?.present();
    },
  }));

  const close = () => sheetRef.current?.dismiss();

  const commitDraft = () => {
    setKeywords(withKeyword(keywords, draft));
    setDraft('');
  };

  // What Save would store: committed chips plus a still-typed valid keyword.
  const finalKeywords = withKeyword(keywords, draft);
  const pillDraft = { name: name.trim() || defaultPillName(finalKeywords), keywords: finalKeywords };
  const canSave = isValidDraft(pillDraft);

  const pattern = useMemo(() => compilePill(keywords), [keywords]);
  const matches = useMemo(
    () => (pattern ? stories.filter((s) => storyMatches(pattern, s)) : []),
    [pattern, stories],
  );

  const save = () => {
    if (!canSave) return;
    const finalPattern = compilePill(pillDraft.keywords);
    const props = {
      name: pillDraft.name,
      keywords: pillDraft.keywords,
      keyword_count: pillDraft.keywords.length,
      match_count: finalPattern ? stories.filter((s) => storyMatches(finalPattern, s)).length : 0,
    };
    if (editing) {
      updatePill(editing.id, pillDraft);
      emit('pill_edited', props);
    } else {
      const created = addPill(pillDraft);
      if (!created) return;
      emit('pill_created', props);
      onCreated(created);
    }
    close();
  };

  const confirmRemove = () => {
    if (!editing) return;
    Alert.alert(`Remove ${editing.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removePill(editing.id);
          emit('pill_removed', { name: editing.name, keywords: editing.keywords });
          close();
        },
      },
    ]);
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.32}
        style={[props.style, styles.backdrop]}
      />
    ),
    [],
  );

  // Save (and Remove) ride the sheet footer so they stay above the keyboard.
  const renderFooter = (props: BottomSheetFooterProps) => (
    <BottomSheetFooter {...props} bottomInset={0}>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.s4) }]}>
        <Pressable
          onPress={save}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          style={({ pressed }) => [styles.save, !canSave && styles.saveDisabled, pressed && styles.savePressed]}
        >
          <Text style={styles.saveLabel}>{editing ? 'Save changes' : 'Save pill'}</Text>
        </Pressable>
        {editing ? (
          <Pressable onPress={confirmRemove} accessibilityRole="button" style={styles.remove} hitSlop={8}>
            <Text style={styles.removeLabel}>Remove pill</Text>
          </Pressable>
        ) : null}
      </View>
    </BottomSheetFooter>
  );

  const full = keywords.length >= PILL_LIMITS.keywords;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      accessibilityLabel={editing ? `Edit ${editing.name}` : 'New pill'}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={close} accessibilityRole="button" hitSlop={12} style={styles.cancel}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
        <Text style={styles.headline}>What should this pill catch?</Text>

        <FNCap style={styles.fieldLabel}>Keywords</FNCap>
        <View style={styles.chipField}>
          {keywords.map((k) => (
            <View key={k} style={styles.chip}>
              <Text style={styles.chipLabel}>{k}</Text>
              <Pressable
                onPress={() => setKeywords(keywords.filter((x) => x !== k))}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${k}`}
              >
                <CrossGlyph />
              </Pressable>
            </View>
          ))}
          {full ? null : (
            <View style={styles.draftRow}>
              <BottomSheetTextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={commitDraft}
                submitBehavior="submit"
                maxLength={PILL_LIMITS.keywordChars}
                placeholder={keywords.length ? 'Add a keyword' : 'e.g. tariff'}
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                accessibilityLabel="Add a keyword"
                style={styles.draftInput}
              />
              {draft ? <Counter n={draft.length} max={PILL_LIMITS.keywordChars} /> : null}
            </View>
          )}
        </View>
        <Text style={styles.helper}>
          {keywords.length
            ? `${keywords.length} of ${PILL_LIMITS.keywords} keywords`
            : `Up to ${PILL_LIMITS.keywords} keywords.`}
        </Text>

        <FNCap style={styles.fieldLabel}>Pill name</FNCap>
        <View style={styles.nameRow}>
          <BottomSheetTextInput
            value={name}
            onChangeText={setName}
            maxLength={PILL_LIMITS.nameChars}
            placeholder={defaultPillName(finalKeywords) || 'Optional'}
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            accessibilityLabel="Pill name"
            style={styles.nameInput}
          />
          <Counter n={name.length} max={PILL_LIMITS.nameChars} />
        </View>

        {pattern ? (
          <>
            <View style={styles.rule} />
            <View style={styles.matchesHead}>
              <FNCap color={colors.ink}>Matches now</FNCap>
              <FNCap>
                <Text style={styles.num}>{matches.length}</Text> {matches.length === 1 ? 'story' : 'stories'}
              </FNCap>
            </View>
            {matches.slice(0, PREVIEW_ROWS).map((s, i) => (
              <View key={s.id} style={[styles.matchRow, i > 0 && styles.matchDivider]}>
                <FNCap>{formatRecency(s.time_start)}</FNCap>
                <Headline title={s.title} pattern={pattern} />
              </View>
            ))}
          </>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

// A match-preview headline with the matched keyword underlined.
function Headline({ title, pattern }: { title: string; pattern: RegExp }) {
  const range = matchRange(pattern, title);
  if (!range) return <Text style={styles.matchTitle}>{title}</Text>;
  const [start, end] = range;
  return (
    <Text style={styles.matchTitle}>
      {title.slice(0, start)}
      <Text style={styles.hit}>{title.slice(start, end)}</Text>
      {title.slice(end)}
    </Text>
  );
}

function Counter({ n, max }: { n: number; max: number }) {
  return (
    <Text style={styles.counter}>
      {n}/{max}
    </Text>
  );
}

function CrossGlyph() {
  return (
    <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
      <Path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke={colors.muted} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

// Room the footer takes, so the scroll content never sits under it.
const FOOTER_CLEARANCE = 140;

const styles = StyleSheet.create({
  // Sheet chrome — same values as FNAllSourcesSheet.
  background: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  backdrop: { backgroundColor: colors.ink },
  handle: { paddingTop: 4, paddingBottom: 2 },
  handleIndicator: { width: 36, height: 4, backgroundColor: 'rgba(31, 26, 20, 0.20)' },

  content: { paddingHorizontal: spacing.s5, paddingBottom: FOOTER_CLEARANCE },
  cancel: { alignSelf: 'flex-start', paddingVertical: spacing.s2 },
  cancelLabel: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.base, color: colors.muted },
  headline: {
    fontFamily: fontFamily.displayWonky,
    fontSize: fontSize.title,
    lineHeight: fontSize.title * FRAUNCES_LEADING,
    letterSpacing: fontSize.title * -0.018,
    color: colors.ink,
    marginTop: spacing.s2,
  },
  fieldLabel: { marginTop: spacing.s6 },
  chipField: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.s2,
    paddingVertical: spacing.s2,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    paddingVertical: spacing.s1,
    paddingLeft: spacing.s3,
    paddingRight: spacing.s2,
    borderRadius: 999,
    backgroundColor: colors.paper2,
  },
  chipLabel: { fontFamily: fontFamily.uiMedium, fontSize: fontSize.base, color: colors.ink },
  draftRow: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.s2, minWidth: 120 },
  draftInput: {
    flex: 1,
    fontFamily: fontFamily.uiMedium,
    fontSize: fontSize.lead,
    color: colors.ink,
    paddingVertical: spacing.s1,
  },
  helper: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.fine,
    lineHeight: fontSize.fine * 1.45,
    color: colors.muted,
    marginTop: spacing.s2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingVertical: spacing.s2,
    borderBottomWidth: 1,
    borderBottomColor: colors.faint,
  },
  nameInput: {
    flex: 1,
    fontFamily: fontFamily.uiMedium,
    fontSize: fontSize.lead,
    color: colors.ink,
    paddingVertical: spacing.s1,
  },
  counter: { fontFamily: fontFamily.mono, fontSize: fontSize.fine, color: colors.muted },
  rule: { height: 1, backgroundColor: colors.ink, marginTop: spacing.s7 },
  matchesHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.s3,
  },
  num: { fontFamily: fontFamily.mono },
  matchRow: { paddingVertical: spacing.s3, gap: spacing.s1 },
  matchDivider: { borderTopWidth: 1, borderTopColor: colors.faint },
  matchTitle: {
    fontFamily: fontFamily.displayPlain,
    fontSize: fontSize.lead,
    lineHeight: fontSize.lead * FRAUNCES_LEADING,
    color: colors.ink,
  },
  hit: { fontFamily: fontFamily.displayBold, textDecorationLine: 'underline' },

  footer: {
    paddingHorizontal: spacing.s5,
    paddingTop: spacing.s3,
    backgroundColor: colors.paper,
  },
  save: { backgroundColor: colors.ink, paddingVertical: spacing.s4, alignItems: 'center' },
  saveDisabled: { opacity: 0.4 },
  savePressed: { backgroundColor: colors.ink2 }, // design .tp-cta-filled:active
  saveLabel: {
    fontFamily: fontFamily.uiSemiBold,
    fontSize: fontSize.fine,
    letterSpacing: fontSize.fine * 0.12,
    textTransform: 'uppercase',
    color: colors.paper,
  },
  remove: { alignSelf: 'center', paddingTop: spacing.s4 },
  removeLabel: {
    fontFamily: fontFamily.uiSemiBold,
    fontSize: fontSize.fine,
    letterSpacing: fontSize.fine * 0.12,
    textTransform: 'uppercase',
    color: colors.ink2,
  },
});
