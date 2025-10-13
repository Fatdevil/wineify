import { screen } from '@testing-library/react';
import ResultsView from '../../components/ResultsView';
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

describe('ResultsView', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders settled competitions and summary', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        results: [
          {
            id: 'result-1',
            eventId: 'event-1',
            eventTitle: 'Weekly Quiz',
            competition: 'Round 1',
            winningOutcome: 'Team Red',
            payoutPerUnit: 3,
            settledAt: new Date('2024-04-02T10:00:00Z').toISOString()
          }
        ],
        totalPayout: 150,
        netUnits: 90
      }
    });

    renderWithProviders(<ResultsView />, {
      route: '/results/event-1',
      path: '/results/:eventId'
    });

    expect(await screen.findByText('Round 1')).toBeInTheDocument();
    expect(screen.getByText('Winning outcome')).toBeInTheDocument();
    expect(screen.getByText(/Total payout/)).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalledWith('/results/event-1');
  });
});
