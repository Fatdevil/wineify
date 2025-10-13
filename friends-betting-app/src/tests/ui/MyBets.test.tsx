import { screen } from '@testing-library/react';
import MyBets from '../../components/MyBets';
import renderWithProviders from './utils';
import api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn()
  }
}));

type MockedApi = {
  get: ReturnType<typeof vi.fn>;
};

const mockedApi = api as unknown as MockedApi;

describe('MyBets', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows user bets with status badges', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        bets: [
          {
            id: 'bet-1',
            eventId: 'event-1',
            eventTitle: 'Weekly Quiz',
            outcome: 'Team Red',
            odds: 2.1,
            stake: 50,
            potentialPayout: 105,
            status: 'won'
          }
        ]
      }
    });

    renderWithProviders(<MyBets />);

    expect(await screen.findByText('Weekly Quiz')).toBeInTheDocument();
    expect(screen.getByText('Outcome: Team Red')).toBeInTheDocument();
    expect(screen.getByText(/Potential Payout/)).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalledWith('/bets/mine');
  });
});
