import { hashToStationIndex, stationIndexToHash } from './stationHash';

const IDS = ['amazingcat', 'polykod', 'mplat', 'gisgis'];

describe('hashToStationIndex', () => {
  it('находит станцию по хэшу', () => {
    expect(hashToStationIndex('#mplat', IDS)).toBe(2);
    expect(hashToStationIndex('#amazingcat', IDS)).toBe(0);
  });

  it('принимает хэш и без решётки', () => {
    expect(hashToStationIndex('gisgis', IDS)).toBe(3);
  });

  it('на пустой и неизвестный хэш отвечает null', () => {
    expect(hashToStationIndex('', IDS)).toBeNull();
    expect(hashToStationIndex('#', IDS)).toBeNull();
    expect(hashToStationIndex('#unknown', IDS)).toBeNull();
  });
});

describe('stationIndexToHash', () => {
  it('строит хэш по индексу', () => {
    expect(stationIndexToHash(2, IDS)).toBe('#mplat');
  });

  it('на индекс за границами отвечает пустой строкой', () => {
    expect(stationIndexToHash(9, IDS)).toBe('');
    expect(stationIndexToHash(-1, IDS)).toBe('');
  });
});
