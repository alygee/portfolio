import { scrollMetricsToProgress } from './scrollProgress';

describe('scrollMetricsToProgress', () => {
  it('в начале документа даёт 0', () => {
    expect(
      scrollMetricsToProgress({ scrollTop: 0, scrollHeight: 4000, viewportHeight: 800 }),
    ).toBe(0);
  });

  it('в конце документа даёт 1', () => {
    expect(
      scrollMetricsToProgress({ scrollTop: 3200, scrollHeight: 4000, viewportHeight: 800 }),
    ).toBe(1);
  });

  it('на середине даёт 0.5', () => {
    expect(
      scrollMetricsToProgress({ scrollTop: 1600, scrollHeight: 4000, viewportHeight: 800 }),
    ).toBe(0.5);
  });

  it('на нескроллируемом документе даёт 0, а не NaN', () => {
    expect(
      scrollMetricsToProgress({ scrollTop: 0, scrollHeight: 600, viewportHeight: 800 }),
    ).toBe(0);
    expect(
      scrollMetricsToProgress({ scrollTop: 0, scrollHeight: 800, viewportHeight: 800 }),
    ).toBe(0);
  });

  it('клампит инерционный перескролл за границы', () => {
    expect(
      scrollMetricsToProgress({ scrollTop: -120, scrollHeight: 4000, viewportHeight: 800 }),
    ).toBe(0);
    expect(
      scrollMetricsToProgress({ scrollTop: 5000, scrollHeight: 4000, viewportHeight: 800 }),
    ).toBe(1);
  });
});
