import { Pressable, StyleSheet } from 'react-native';

import { FNRibbon } from './FNRibbon';
import type { ContentRef } from '@/lib/content';
import { toggleSaved, useIsSaved } from '@/lib/saved';

// The save mark — a ribbon/bookmark in the detail masthead. Resting = ink
// outline; saved = the ochre "now" accent filling in. This is the design's one
// sanctioned decorative use of `accent`: it marks the user's own live
// relationship to the item. Source: design/ThinkPattern RibbonGlyph + SaveButton.
export function FNSaveButton({ item, size = 20 }: { item: ContentRef; size?: number }) {
  const saved = useIsSaved(item.id);
  return (
    <Pressable
      onPress={() => toggleSaved(item)}
      hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? 'Saved' : 'Save'}
      style={styles.btn}
    >
      <FNRibbon saved={saved} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexShrink: 0, padding: 4 },
});
