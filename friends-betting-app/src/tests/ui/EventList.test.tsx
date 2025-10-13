import { screen } from '@testing-library/react';
import EventList from '../../components/EventList';
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

describe('EventList', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders events returned by the API', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        events: [
          {
            id: '1',
            title: 'Championship Final',
            description: 'Best of five',
            status: 'open',
            closesAt: new Date('2024-04-01T12:00:00Z').toISOString(),
            totalPool: 1200
          }
        ]
      }
    });

    renderWithProviders(<EventList />);

    expect(await screen.findByText('Championship Final')).toBeInTheDocument();
    expect(screen.getByText(/Best of five/)).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalledWith('/events');
  });
});
