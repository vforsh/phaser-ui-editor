/** @type {import("@commitlint/types").UserConfig} */
export default {
	extends: ["@commitlint/config-conventional"],
	// Don't ignore "Merge ..." / "Revert ..." commits. We want them to fail lint.
	defaultIgnores: false,
	// Keep scope optional (default conventional), but disallow the `revert` type.
	rules: {
		"type-enum": [
			2,
			"always",
			["build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "style", "test"],
		],
		"header-max-length": [2, "always", 120],
		"body-max-line-length": [0],
	},
};