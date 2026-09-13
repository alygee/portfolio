import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('показывает имя в единственном заголовке первого уровня', () => {
    render(<App />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Альберт Аллагулов');
  });
});
