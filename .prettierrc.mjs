/**
 * @type {import('prettier').Config}
 */
const config = {
	printWidth: 120,
	tabWidth: 4,
	useTabs: true,
	semi: false,
	singleQuote: true,
	trailingComma: 'es5',
	quoteProps: 'consistent',
	plugins: ['prettier-plugin-organize-imports'],
}

export default config
