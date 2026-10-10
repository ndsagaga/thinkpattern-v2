import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { FNScreen } from '@/components/fn/FNScreen';
import { FNSubNav } from '@/components/fn/FNSubNav';
import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { fontFamily, fontSize, typography } from '@/constants/Typography';
import { signIn, signUp } from '@/hooks/useAuth';

// Optional account, only needed to like and comment. Email + password, no
// confirmation step; returns to the previous screen on success.
export default function SignInScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === 'signup';
  const canSubmit = !!email.trim() && password.length >= 6 && (!isSignup || !!name.trim()) && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (isSignup) await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FNScreen>
      <FNSubNav title={isSignup ? 'Create account' : 'Sign in'} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Join the conversation.</Text>
        <Text style={styles.dek}>An account is only needed to like and comment. Reading stays open.</Text>

        {isSignup ? (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
            autoComplete="name"
            maxLength={60}
            style={styles.input}
          />
        ) : null}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password (6+ characters)"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          onSubmitEditing={submit}
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          accessibilityRole="button"
        >
          <Text style={styles.buttonLabel}>{busy ? 'One moment…' : isSignup ? 'Create account' : 'Sign in'}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(isSignup ? 'signin' : 'signup');
            setError(null);
          }}
          style={styles.switch}
          accessibilityRole="button"
        >
          <Text style={styles.switchLabel}>
            {isSignup ? 'I already have an account' : 'I’m new here — create an account'}
          </Text>
        </Pressable>
      </ScrollView>
    </FNScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.xxxl, gap: spacing.md },
  title: { ...typography.display3, color: colors.ink },
  dek: { ...typography.body, fontSize: fontSize.base, lineHeight: 22, color: colors.ink2, marginBottom: spacing.lg },
  input: {
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.base,
    color: colors.ink,
    backgroundColor: colors.paper2,
  },
  error: { ...typography.body, color: colors.link },
  button: { backgroundColor: colors.ink, paddingVertical: spacing.md, borderRadius: 4, alignItems: 'center', marginTop: spacing.sm },
  buttonDisabled: { opacity: 0.4 },
  buttonLabel: { fontFamily: fontFamily.uiSemiBold, fontSize: fontSize.base, color: colors.paper },
  switch: { alignSelf: 'center', paddingVertical: spacing.sm },
  switchLabel: { fontFamily: fontFamily.uiMedium, fontSize: fontSize.detail, color: colors.link },
});
