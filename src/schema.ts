import { AuthPluginSchema } from 'better-auth';

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
} satisfies AuthPluginSchema;
