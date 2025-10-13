import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settlements from '../../components/Settlements';
import renderWithProviders from './utils';
import api from '../../lib/api';

type MockedApi = {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

const mockedApi = api as unknown as MockedApi;

describe('Settlements', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('marks a settlement as received optimistically', async () => {
    mockedApi.get
      .mockResolvedValueOnce({
        data: {
          settlements: [
            {
              id: 'set-1',
              counterparty: 'Jamie',
              amount: 75,
              status: 'pending'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          settlements: [
            {
              id: 'set-1',
              counterparty: 'Jamie',
              amount: 75,
              status: 'received'
            }
          ]
        }
      });

    mockedApi.post.mockResolvedValue({});

    renderWithProviders(<Settlements />);

    expect(await screen.findByText('Jamie')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /mark received/i }));

    await waitFor(() => {
      expect(screen.getByText('Received')).toBeInTheDocument();
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/settlements/set-1/mark-received');
  });
});
