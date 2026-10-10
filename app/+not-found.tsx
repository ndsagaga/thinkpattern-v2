import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/Colors';
import { typography } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <Link href="/" replace style={styles.link}>
          <Text style={styles.linkText}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.paper,
  },
  title: {
    ...typography.displayPlain1,
    color: colors.ink,
  },
  link: {
    marginTop: spacing.lg,
  },
  linkText: {
    ...typography.ui,
    color: colors.link,
  },
});
