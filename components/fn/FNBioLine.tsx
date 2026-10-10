import { Text, StyleSheet } from 'react-native';

import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';

type Props = {
  text: string;
  size?: 'sm' | 'md' | 'lg';
};

// Per design/ThinkPattern ActorsList + ActorDetail, bio_line is the prominent
// bold lead, not small/muted: list rows set it at lead (17), detail at sub (20),
// both Inter Tight 700 in solid `colors.ink`. `sm` retained for any compact
// caller, mapped to `detail`.
const SIZE_FS = { sm: fontSize.detail, md: fontSize.lead, lg: fontSize.sub };
// Design line-heights: list 1.24 at lead, detail 1.28 at sub.
const SIZE_LH = { sm: 1.24, md: 1.24, lg: 1.28 } as const;

// Free-text identity line ("Israel's embattled wartime premier"). Replaces the
// retired posture chip (wire 6.0): a bold Inter Tight lead in solid ink, since
// bio_line is open free text with no fixed value set to color-code. Not
// lowercased: unlike the old single-word posture keyword, this is a natural
// phrase with proper nouns ("Israel's…"), so case is preserved.
export function FNBioLine({ text, size = 'md' }: Props) {
  const fs = SIZE_FS[size];
  return (
    <Text
      style={[
        styles.text,
        { fontSize: fs, lineHeight: fs * SIZE_LH[size], letterSpacing: -fs * 0.01 },
      ]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fontFamily.uiBold, // Inter Tight 700
    color: colors.ink,
  },
});
