import { render, screen, within } from '@testing-library/react';
import { jobs, type Project } from '@/content';
import { ResumeDocument } from './ResumeDocument';

describe('ResumeDocument', () => {
  it('показывает все места работы из контента', () => {
    render(<ResumeDocument now="2026-08" />);
    for (const job of jobs) {
      expect(screen.getByText(job.company)).toBeInTheDocument();
    }
  });

  it('содержит единственный заголовок первого уровня с именем', () => {
    render(<ResumeDocument now="2026-08" />);
    const h1 = screen.getAllByRole('heading', { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent('Альберт Аллагулов');
  });

  it('показывает суммарный стаж', () => {
    render(<ResumeDocument now="2026-08" />);
    expect(screen.getByText(/9 лет 9 месяцев/)).toBeInTheDocument();
  });

  it('у каждой работы выводится её длительность', () => {
    render(<ResumeDocument now="2026-08" />);
    expect(screen.getByText(/6 лет 11 месяцев/)).toBeInTheDocument();
    expect(screen.getByText(/1 год 3 месяца/)).toBeInTheDocument();
  });

  it('внешние ссылки открываются безопасно', () => {
    render(<ResumeDocument now="2026-08" />);
    const link = screen.getByRole('link', { name: /mplat\.io/ });
    expect(link).toHaveAttribute('href', 'https://mplat.io/');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('каждая работа — это отдельная секция с доступным именем', () => {
    render(<ResumeDocument now="2026-08" />);
    for (const job of jobs) {
      expect(
        screen.getByRole('region', { name: new RegExp(job.company) }),
      ).toBeInTheDocument();
    }
  });

  it('группирует навыки по категориям', () => {
    render(<ResumeDocument now="2026-08" />);

    const geoHeading = screen.getByRole('heading', { name: 'Картография' });
    const geoGroup = geoHeading.closest('.skills__group');
    expect(geoGroup).not.toBeNull();
    expect(within(geoGroup as HTMLElement).getByText('MapLibre')).toBeInTheDocument();
    expect(within(geoGroup as HTMLElement).queryByText('Jest')).not.toBeInTheDocument();

    const testingHeading = screen.getByRole('heading', { name: 'Тестирование' });
    const testingGroup = testingHeading.closest('.skills__group');
    expect(testingGroup).not.toBeNull();
    expect(within(testingGroup as HTMLElement).getByText('Jest')).toBeInTheDocument();
    expect(
      within(testingGroup as HTMLElement).queryByText('MapLibre'),
    ).not.toBeInTheDocument();
  });

  const sampleProject: Project = {
    id: 'tabular',
    title: 'Табличная модель',
    kind: 'project',
    date: '2027-02',
    url: 'https://github.com/alygee/tabular',
    summary: 'Модель оттока.',
    bullets: ['CatBoost против логистической регрессии.'],
    stack: ['python'],
  };

  it('раздела «ML-проекты» нет, пока проектов нет', () => {
    render(<ResumeDocument now="2026-08" />);
    expect(screen.queryByRole('heading', { name: 'ML-проекты' })).not.toBeInTheDocument();
  });

  it('раздел «ML-проекты» появляется с первым проектом и не становится якорем маршрута', () => {
    const { container } = render(<ResumeDocument now="2026-08" projects={[sampleProject]} />);
    expect(screen.getByRole('heading', { name: 'ML-проекты' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Табличная модель' })).toHaveAttribute(
      'href',
      'https://github.com/alygee/tabular',
    );
    // Якоря маршрута — `section[id]`; у раздела проектов id нет.
    expect(container.querySelector('.projects')!.hasAttribute('id')).toBe(false);
  });

  it('действие секции «Навыки» рендерится внутри неё', () => {
    render(<ResumeDocument now="2026-08" skillsAction={<button type="button">действие</button>} />);
    const section = screen.getByRole('region', { name: 'Навыки' });
    expect(within(section).getByRole('button', { name: 'действие' })).toBeInTheDocument();
  });
});
