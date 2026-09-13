import { injectAppHtml } from './injectAppHtml';

const TEMPLATE = '<html><body><div id="root"></div></body></html>';

describe('injectAppHtml', () => {
  it('вставляет разметку внутрь точки монтирования', () => {
    const result = injectAppHtml(TEMPLATE, '<h1>Привет</h1>');
    expect(result).toBe(
      '<html><body><div id="root"><h1>Привет</h1></div></body></html>',
    );
  });

  it('терпит атрибуты и пробелы в точке монтирования', () => {
    const template = '<div id="root" class="app">   </div>';
    expect(injectAppHtml(template, '<p>x</p>')).toBe(
      '<div id="root" class="app"><p>x</p></div>',
    );
  });

  it('падает, если точки монтирования нет — молчаливо пустая страница хуже ошибки сборки', () => {
    expect(() => injectAppHtml('<body></body>', '<h1>x</h1>')).toThrow(
      /root/,
    );
  });
});
