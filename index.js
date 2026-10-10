// Custom app entry. RNFirebase requires the background message handler to be
// registered at the top level — outside the React tree, before the app mounts.
// We do that here, then hand off to Expo Router's standard entry.
import { registerBackgroundMessageHandler } from './lib/notifications/messaging';
import './lib/webFrame';

registerBackgroundMessageHandler();

// require() (not import) so this runs AFTER the handler is registered. Static
// `import` statements are hoisted, which would otherwise mount the app first.
require('expo-router/entry');
