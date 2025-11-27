import type { BetterAuthPluginDBSchema } from 'better-auth/db';

export const schema = {
  user: {
    fields: {
      username: {
        type: 'string',
        required: false,
        sortable: true,
        unique: true,
        returned: true,
        transform: {
          input(value) {
            return value?.toString().toLowerCase();
          },
        },
      },
    },
  },
} satisfies BetterAuthPluginDBSchema;
