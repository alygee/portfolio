import { Color } from 'three';
import { heightToColor } from './heightColor';

const low = new Color('#101820');
const high = new Color('#40c0a0');

describe('heightToColor', () => {
  it('у земли — нижний цвет, на пике — верхний', () => {
    expect(heightToColor(0, 10, low, high).getHex()).toBe(low.getHex());
    expect(heightToColor(10, 10, low, high).getHex()).toBe(high.getHex());
  });

  it('выше пика не выходит за верхний цвет', () => {
    expect(heightToColor(25, 10, low, high).getHex()).toBe(high.getHex());
  });

  it('чем выше столбик, тем он светлее', () => {
    const lightness = (h: number) => heightToColor(h, 10, low, high).getHSL({ h: 0, s: 0, l: 0 }).l;
    expect(lightness(3)).toBeLessThan(lightness(7));
  });

  it('пишет в переданный target, не создавая объект на каждый экземпляр', () => {
    const target = new Color();
    expect(heightToColor(5, 10, low, high, target)).toBe(target);
  });

  it('не мутирует опорные цвета', () => {
    heightToColor(5, 10, low, high);
    expect(low.getHexString()).toBe('101820');
  });
});
