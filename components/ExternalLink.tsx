import { Link } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { emit } from '@/lib/events';
import { openInAppBrowser } from '@/utils/browser';
import { hostnameOf } from '@/utils/url';

export function ExternalLink(
  props: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }
) {
  return (
    <Link
      target="_blank"
      {...props}
      href={props.href as any}
      onPress={(e) => {
        emit('external_link_opened', { domain: hostnameOf(props.href) });
        if (Platform.OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          e.preventDefault();
          // Open the link in an in-app browser.
          openInAppBrowser(props.href, 'external-link');
        }
      }}
    />
  );
}
