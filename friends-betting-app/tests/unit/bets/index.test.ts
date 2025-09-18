const assert = require('assert');

test('place bet', () => {
    const bet = placeBet('user1', 'teamA', 100);
    assert.strictEqual(bet.user, 'user1');
    assert.strictEqual(bet.team, 'teamA');
    assert.strictEqual(bet.amount, 100);
});

test('retrieve bet', () => {
    const bet = retrieveBet('betId123');
    assert.strictEqual(bet.id, 'betId123');
    assert.strictEqual(bet.user, 'user1');
    assert.strictEqual(bet.team, 'teamA');
});