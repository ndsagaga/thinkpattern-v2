import { shareUrlToRoute } from '@/lib/deepLink';

// expo-router's deep-link entry point. Every incoming link (Universal/App Link
// and the thinkpattern:// scheme) passes through here before routing. We rewrite
// a thinkpattern.ai share URL to its in-app detail route and leave everything
// else untouched.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return shareUrlToRoute(path) ?? path;
}
