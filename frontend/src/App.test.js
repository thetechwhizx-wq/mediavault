import { render, screen } from '@testing-library/react';
import App from './App';

// Mock fetch for API calls in App.js
beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders MediaVault header brand', async () => {
  render(<App />);
  const headerElement = await screen.findByText(/MediaVault/i);
  expect(headerElement).toBeInTheDocument();
});
