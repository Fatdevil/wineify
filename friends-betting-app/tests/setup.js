const betStore = new Map();

betStore.set('betId123', {
    id: 'betId123',
    user: 'user1',
    team: 'teamA',
    amount: 100,
});

function assertNonEmptyString(value, name) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new TypeError(`${name} must be a non-empty string`);
    }
}

function assertPositiveNumber(value, name) {
    if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
        throw new TypeError(`${name} must be a positive number`);
    }
}

global.placeBet = (user, team, amount) => {
    assertNonEmptyString(user, 'user');
    assertNonEmptyString(team, 'team');
    assertPositiveNumber(amount, 'amount');

    const bet = {
        id: `bet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
        user,
        team,
        amount,
    };

    betStore.set(bet.id, bet);
    return bet;
};

global.retrieveBet = (betId) => {
    assertNonEmptyString(betId, 'betId');

    const bet = betStore.get(betId);
    if (!bet) {
        throw new Error(`Bet with id ${betId} does not exist`);
    }

    return bet;
};

const JOIN_CODE_LENGTH = 6;
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const JOIN_CODE_REGEX = new RegExp(`^[${JOIN_CODE_ALPHABET}]{${JOIN_CODE_LENGTH}}$`);

global.generateJoinCode = () => {
    let code = '';
    for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) {
        const index = Math.floor(Math.random() * JOIN_CODE_ALPHABET.length);
        code += JOIN_CODE_ALPHABET.charAt(index);
    }
    return code;
};

global.validateJoinCode = (code) => {
    if (typeof code !== 'string') {
        return false;
    }
    return JOIN_CODE_REGEX.test(code.trim().toUpperCase());
};

process.env.CONFIG_SETTING = 'expectedValue';
