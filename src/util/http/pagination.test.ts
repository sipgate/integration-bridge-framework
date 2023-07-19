//import type { AxiosResponse } from 'axios';
import { paginate } from './pagination';

function* fetchDataGen(chunkSize: number, items: number): any {
  let itemsLeft = items;

  while (itemsLeft > 0) {
    const n = Math.max(0, Math.min(chunkSize, itemsLeft));

    yield new Array(n).fill(0).map((x) => ({
      name: `${Math.random()}`,
      value: Math.random(),
    }));

    itemsLeft -= n;
  }
}

describe('pagination', () => {
  it('should paginate over all pages', async () => {
    const fetchDataIterator = fetchDataGen(3, 8);
    const fetchData = () =>
      Promise.resolve({
        data: fetchDataIterator.next().value,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

    const data = await paginate<Array<any>>(
      (data, newData) => [...(data || []), ...(newData || [])],
      (response) => response?.data,
      (response) => (response?.data?.length || 0) < 3,
      (previousResponse, data) => fetchData(),
      0,
      [],
    );

    expect(data).toHaveLength(8);
  });
});
