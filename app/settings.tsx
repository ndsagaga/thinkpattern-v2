import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { FNCap } from '@/components/fn/FNCap';
import { FNRibbon } from '@/components/fn/FNRibbon';
import { FNScreen } from '@/components/fn/FNScreen';
import { FNSettingsRow } from '@/components/fn/FNSettingsRow';
import { FNSubNav } from '@/components/fn/FNSubNav';
import { FNToggle } from '@/components/fn/FNToggle';
import { colors } from '@/constants/Colors';
import { fontFamily, fontSize, typography } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { useNotificationSetting } from '@/hooks/useNotificationSetting';
import { emit } from '@/lib/events';
import { Sentry } from '@/lib/sentry';
import { useSavedItems } from '@/lib/saved';
import { openInAppBrowser } from '@/utils/browser';
import { hostnameOf } from '@/utils/url';

// Version + build read from the installed binary, not the JS config — EAS
// manages both remotely (appVersionSource "remote" + autoIncrement), so the
// binary is the only truthful source. expoConfig.version is the dev-time
// fallback (Expo Go / prebuild-less runs, where the native values are the
// host app's).
const APP_VERSION =
  Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '';
// iOS CFBundleVersion / Android versionCode — the TestFlight/Play "build".
const APP_BUILD = Application.nativeBuildVersion ?? '';

// Publisher + privacy pages are hosted; per Play policy they open in-app (the
// same OS custom-tab that opens story sources). Contact is a mailto.
const ABOUT_URL = 'https://thinkpattern.ai/site/about.html';
const PRIVACY_URL = 'https://thinkpattern.ai/site/privacy.html';
const CONTACT_EMAIL = 'hello@thinkpattern.ai';

function openContact() {
  emit('external_link_opened', { domain: 'mailto' });
  Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('ThinkPattern')}`).catch(
    (e) => Sentry.captureException(e, { tags: { surface: 'settings-contact' } }),
  );
}

function openAbout() {
  emit('external_link_opened', { domain: hostnameOf(ABOUT_URL) });
  openInAppBrowser(ABOUT_URL, 'settings-about');
}

function openPrivacy() {
  emit('external_link_opened', { domain: hostnameOf(PRIVACY_URL) });
  openInAppBrowser(PRIVACY_URL, 'settings-privacy');
}

export default function SettingsScreen() {
  const savedCount = useSavedItems().length;
  const notif = useNotificationSetting();

  return (
    <FNScreen>
      <FNSubNav title="Settings" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FNCap style={styles.group}>Library</FNCap>
        <Link href="/saved" asChild>
          <FNSettingsRow
            icon={<FNRibbon size={18} />}
            label="Saved"
            right={
              <>
                <Text style={styles.count}>{savedCount}</Text>
                <Chevron />
              </>
            }
          />
        </Link>
        <Link href="/history" asChild>
          <FNSettingsRow icon={<ClockIcon />} label="Reading history" right={<Chevron />} last />
        </Link>

        <FNCap style={styles.group}>Preferences</FNCap>
        <FNSettingsRow
          icon={<BellIcon />}
          label="Notifications"
          onPress={() => notif.setEnabled(!notif.enabled)}
          disabled={notif.busy}
          accessibilityRole="switch"
          accessibilityState={{ checked: notif.enabled, disabled: notif.busy }}
          right={<FNToggle on={notif.enabled} />}
          last
        />

        <FNCap style={styles.group}>About</FNCap>
        <FNSettingsRow
          icon={<InfoIcon />}
          label="About ThinkPattern"
          onPress={openAbout}
          right={<ExtLinkGlyph />}
        />
        <FNSettingsRow
          icon={<ShieldIcon />}
          label="Privacy policy"
          onPress={openPrivacy}
          right={<ExtLinkGlyph />}
        />
        <FNSettingsRow
          icon={<MailIcon />}
          label="Contact"
          sublabel={CONTACT_EMAIL}
          onPress={openContact}
          right={<ExtLinkGlyph />}
          last
        />

        {APP_VERSION ? (
          <Text style={styles.version}>
            ThinkPattern · v{APP_VERSION}
            {APP_BUILD ? ` (${APP_BUILD})` : ''}
          </Text>
        ) : null}
      </ScrollView>
    </FNScreen>
  );
}

function ClockIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={1.6}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3.5 2" strokeLinecap="round" />
    </Svg>
  );
}

function BellIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={1.6}>
      <Path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <Path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
    </Svg>
  );
}

function InfoIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={1.6}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 11v5" strokeLinecap="round" />
      <Circle cx={12} cy={7.6} r={0.9} fill={colors.ink} stroke="none" />
    </Svg>
  );
}

function ShieldIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={1.6} strokeLinejoin="round">
      <Path d="M12 3l7 2.5V11c0 5-3.4 8.2-7 10-3.6-1.8-7-5-7-10V5.5L12 3Z" />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={1.6} strokeLinejoin="round">
      <Rect x={3.5} y={5.5} width={17} height={13} rx={1.5} />
      <Path d="m4 7 8 5.5L20 7" />
    </Svg>
  );
}

// External-link mark on the About rows — they open web pages / mail, not routes.
function ExtLinkGlyph() {
  return (
    <Svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke={colors.link} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 3.5H4A1.5 1.5 0 0 0 2.5 5v7A1.5 1.5 0 0 0 4 13.5h7A1.5 1.5 0 0 0 12.5 12v-2" />
      <Path d="M9.5 2.5H13.5V6.5" />
      <Path d="M13.5 2.5 7.5 8.5" />
    </Svg>
  );
}

function Chevron() {
  return <Text style={styles.chevron}>›</Text>;
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.xxl },
  group: { marginTop: spacing.xxl, marginBottom: spacing.xs }, // 24 / 4
  count: { ...typography.num, fontSize: fontSize.fine, color: colors.muted },
  chevron: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.lead, color: colors.faint },
  version: { ...typography.num, fontSize: fontSize.fine, color: colors.muted, marginTop: spacing.xxl },
});
