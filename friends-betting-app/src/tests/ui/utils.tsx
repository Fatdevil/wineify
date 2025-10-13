import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

export function renderWithProviders(ui: ReactElement, { route = '/', path = '/' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return {
    queryClient,
    ...renderWithRouter(ui, { route, path, queryClient })
  };
}

function renderWithRouter(
  ui: ReactElement,
  {
    route,
    path,
    queryClient
  }: {
    route: string;
    path: string;
    queryClient: QueryClient;
  }
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export default renderWithProviders;
