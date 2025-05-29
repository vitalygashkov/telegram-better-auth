# Telegram Better Auth

The Telegram plugin for Better Auth allows users to log in with their Telegram account. The plugin provides a simple way to integrate Telegram sign in into your application, handling the client-side and server-side logic for you.

## Get your Telegram bot credentials

To use Telegram sign in, you need a bot token. The bot must be linked to a domain (this can be done with **/setdomain** command in the [@BotFather](https://t.me/botfather) bot).

## Configure the plugin

To configure the plugin, you need to import the plugin and pass it to the plugins option of the auth instance.

```ts
// auth.ts
import { betterAuth } from 'better-auth';
import { telegram } from 'telegram-better-auth';

export const auth = betterAuth({
  plugins: [
    telegram({
      botToken: process.env.BOT_TOKEN,
      getTempEmail: (id) => `${id}@t.me`,
    }),
  ],
});
```

## Sign In with Telegram

To sign in with Telegram, you can use the `signIn.telegram` function provided by the client. The `signIn.telegram` function takes an object with the properties described here: [Receiving authorization data](https://core.telegram.org/widgets/login#receiving-authorization-data).

All these properties are provided by [Telegram Login Widget](https://core.telegram.org/widgets/login) when using callback function.

```ts
// auth-client.ts
import { createAuthClient } from 'better-auth/client';
import { telegramClient } from 'telegram-better-auth';

const authClient = createAuthClient({
  plugins: [telegramClient()],
});

interface User {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  photo_url: string;
  auth_date: number;
  hash: string;
}

const onTelegramAuth = async (user: User) => {
  const data = await authClient.signIn.telegram(user);
  // Refetch the session, redirect to home page, etc.
};
```
