import { createEvent, joinEvent, placeBet, recordResult } from '../../src/events';
import { generateJoinCode } from '../../src/join-codes';
import { User } from '../../src/types';

describe('Integration Tests for Friends Betting App', () => {
    let eventCode: string;
    let user: User;

    beforeAll(() => {
        user = { username: 'testUser', displayName: 'Test User', role: 'bettor' };
        eventCode = generateJoinCode();
    });

    test('should create a new betting event', async () => {
        const event = await createEvent('Golf Tournament', 100);
        expect(event).toHaveProperty('name', 'Golf Tournament');
        expect(event).toHaveProperty('joinCode', eventCode);
    });

    test('should allow user to join the event', async () => {
        const result = await joinEvent(eventCode, user);
        expect(result).toBe(true);
    });

    test('should allow user to place a bet', async () => {
        const bet = await placeBet(eventCode, user.username, 'Player A', 10);
        expect(bet).toHaveProperty('amount', 10);
        expect(bet).toHaveProperty('participant', 'Player A');
    });

    test('should record the result of the event', async () => {
        const result = await recordResult(eventCode, 'Player A');
        expect(result).toHaveProperty('winner', 'Player A');
    });
});