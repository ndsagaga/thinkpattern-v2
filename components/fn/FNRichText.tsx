import { Text, type StyleProp, type TextStyle } from 'react-native';

import { parseInlineMarkdown } from '@/lib/markdown';

type Props = {
  // Markdown source. Supports paragraph breaks (\n\n) + inline **bold** and
  // *italic*/_italic_ (via lib/markdown). Anything else renders as plain text —
  // visible degradation rather than parser breakage. If the backend starts
  // emitting headings, lists, or links, swap in a full markdown library.
  text: string;
  // Style applied to each paragraph's <Text>. Bold/italic spans inherit
  // fontSize/lineHeight/color from this and only override the typeface.
  style?: StyleProp<TextStyle>;
  // Vertical gap between paragraphs. Defaults to 12pt — roughly one blank line.
  paragraphSpacing?: number;
};

export function FNRichText({ text, style, paragraphSpacing = 12 }: Props) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <>
      {paragraphs.map((para, i) => (
        <Text key={i} style={[style, i > 0 ? { marginTop: paragraphSpacing } : null]}>
          {parseInlineMarkdown(para)}
        </Text>
      ))}
    </>
  );
}
