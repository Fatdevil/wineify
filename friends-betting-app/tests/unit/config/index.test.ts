const assert = require('assert');
test('Configuration settings are loaded correctly', () => {
	assert.strictEqual(process.env.CONFIG_SETTING, 'expectedValue');
});