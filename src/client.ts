import type { BetterAuthClientPlugin } from 'better-auth';
import type { telegram } from './index';

export const telegramClient = () => {
  return {
    id: 'telegram-client',
    $InferServerPlugin: {} as ReturnType<typeof telegram>,
  } satisfies BetterAuthClientPlugin;
};
