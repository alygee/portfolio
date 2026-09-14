import { act, render, screen } from '@testing-library/react';
import App from './App';

/**
 * Ленивый чанк сцены весит больше 200 КБ и грузится по сети: флаки-сеть,
 * прокси или сбой хостинга роняют его рендер. Без границы ошибок исключение
 * размонтировало бы корень целиком — вместо резюме посетитель получал бы
 * пустой тёмный экран, причём только на машинах, где сцена вообще запускается.
 */
vi.mock('@/shared/hooks/useSceneEnabled', () => ({ useSceneEnabled: () => true }));
// Со смонтированной сценой мост скролла подключает инерционный скролл, а
// настоящий Lenis требует ResizeObserver, которого в jsdom нет. Здесь
// проверяется граница ошибок, а не мост скролла, — подменяем конструктор.
vi.mock('lenis', () => ({
  default: class LenisStub {
    on() {}
    raf() {}
    destroy() {}
  },
}));
vi.mock('@/features/career-flight/SceneLayer', () => ({
  default: () => {
    throw new Error('чанк сцены не загрузился');
  },
}));

describe('App при падении 3D-слоя', () => {
  it('оставляет резюме в DOM', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);

    // Ждём, пока осядет промис ленивого импорта: без этого проверка проходит
    // до того, как слой вообще попытается отрендериться.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Альберт Аллагулов');
    expect(screen.getByText(/Образование/)).toBeInTheDocument();
  });
});
