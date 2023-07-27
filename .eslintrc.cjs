module.exports = {
	root: true,
	extends: [
		"nirtamir2",
		"nirtamir2/recommended",
		"nirtamir2/typescript",
		"nirtamir2/solid",
		"nirtamir2/security",
		"nirtamir2/compat",
	],
	rules:{
		"@typescript-eslint/explicit-member-accessibility": "off",
		"no-console": "off",
		"@typescript-eslint/require-await": "off",
		"import/no-nodejs-modules": "off",
		"@typescript-eslint/member-ordering": "off"
	}
};
