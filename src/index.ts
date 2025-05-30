import type { Account, BetterAuthPlugin, InferOptionSchema, User } from 'better-auth';
import { createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod/v4';
import { schema } from './schema';
import { mergeSchema } from 'better-auth/db';

const verifyTelegramData = async (botToken: string, data: Record<string, any>) => {
  const encoder = new TextEncoder();
  const botTokenBuffer = encoder.encode(botToken);
  const secretKey = await crypto.subtle.digest('SHA-256', botTokenBuffer);
  const dataString = Object.keys(data)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join('\n');
  const key = await crypto.subtle.importKey('raw', secretKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataString));
  const hmac = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hmac === data['hash'];
};

export interface UserWithUsername extends User {
  username: string;
}

export interface TelegramOptions {
  schema?: InferOptionSchema<typeof schema>;
  /**
   * The bot token
   */
  botToken: string;
  /**
   * When a user signs up, a temporary email will be need to be created
   * to sign up the user. This function should return a temporary email
   * for the user given the telegram id and username
   *
   * @param id
   * @param username
   * @returns string (temporary email)
   */
  getTempEmail: (id: number, username?: string) => string;
  redirect?: string;
}

export { telegramClient } from './client';

export const telegram = (options: TelegramOptions) => {
  return {
    id: 'telegram',
    endpoints: {
      signInTelegram: createAuthEndpoint(
        '/sign-in/telegram',
        {
          method: 'POST',
          body: z.object({
            id: z.number(),
            first_name: z.string(),
            last_name: z.string().optional(),
            username: z.string().optional(),
            photo_url: z.string().optional(),
            auth_date: z.number(),
            hash: z.string(),
          }),
        },
        async (ctx) => {
          const isVerified = verifyTelegramData(options.botToken, ctx.body);
          if (!isVerified) return ctx.error(401);

          const telegramId = ctx.body.id;
          const telegramUsername = ctx.body.username;
          const telegramName = `${ctx.body.first_name || ''} ${ctx.body.last_name || ''}`.trim();
          const telegramEmail = options.getTempEmail(telegramId, telegramUsername);
          const telegramImage = ctx.body.photo_url;

          let user = await ctx.context.adapter.findOne<UserWithUsername>({
            model: 'user',
            where: [{ field: 'email', value: telegramEmail.toLowerCase() }],
          });

          if (!user) {
            user = await ctx.context.internalAdapter.createUser<UserWithUsername>({
              name: telegramName,
              email: telegramEmail,
              emailVerified: true,
              image: telegramImage,
              username: telegramUsername,
            });
          } else {
            await ctx.context.internalAdapter.updateUser(user.id, {
              name: telegramName,
              image: telegramImage,
              username: telegramUsername,
            });
          }

          let account = await ctx.context.adapter.findOne<Account>({
            model: 'account',
            where: [
              { field: 'accountId', value: String(telegramId) },
              { field: 'providerId', value: 'telegram' },
            ],
          });

          if (!account) {
            account = await ctx.context.internalAdapter.createAccount({
              userId: user.id,
              accountId: String(telegramId),
              providerId: 'telegram',
            });
          }

          const session = await getSessionFromCtx(ctx);
          let sessionToken = session?.session.token;

          if (!sessionToken) {
            const newSession = await ctx.context.internalAdapter.createSession(user.id, ctx);
            if (!newSession) {
              return ctx.json(null, {
                status: 500,
                body: {
                  message: 'FAILED_TO_CREATE_SESSION',
                },
              });
            }
            sessionToken = newSession.token;
            await setSessionCookie(ctx, { session: newSession, user });
          }

          return ctx.json({
            status: true,
            token: sessionToken,
            user: {
              id: user.id,
              email: user.email,
              emailVerified: user.emailVerified,
              name: user.name,
              image: user.image,
              username: user.username,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            } as UserWithUsername,
          });
        }
      ),
    },
    schema: mergeSchema(schema, options?.schema),
  } satisfies BetterAuthPlugin;
};
