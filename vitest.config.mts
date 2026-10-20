import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/shared/domain/**', 'src/modules/**', 'src/shared/storage/migrations.ts'],
    },
  },
});
