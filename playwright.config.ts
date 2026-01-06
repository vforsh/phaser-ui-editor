import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './tests/e2e/specs',
	testMatch: ['**/*.spec.ts'],
	timeout: 15_000,
})
