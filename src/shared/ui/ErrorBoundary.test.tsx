import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('ленивый чанк не загрузился');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React сам пишет пойманную ошибку в console.error — глушим, чтобы вывод
    // теста не выглядел как падение, и одновременно проверяем свою запись.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('поймав ошибку, рендерит null и не мешает соседнему содержимому', () => {
    render(
      <>
        <div data-testid="slot">
          <ErrorBoundary>
            <Boom />
          </ErrorBoundary>
        </div>
        <p>резюме на месте</p>
      </>,
    );

    expect(screen.getByTestId('slot')).toBeEmptyDOMElement();
    expect(screen.getByText('резюме на месте')).toBeInTheDocument();
  });

  it('сообщает об ошибке в консоль', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('не отрендерена'),
      expect.any(Error),
    );
  });

  it('без ошибки рендерит детей как есть', () => {
    // Без этой проверки границу можно было бы «реализовать» как компонент,
    // который всегда возвращает null.
    render(
      <ErrorBoundary>
        <p>сцена</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('сцена')).toBeInTheDocument();
  });
});
