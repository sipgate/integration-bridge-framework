//import type { AxiosResponse } from 'axios';
import { paginate, paginateGenerator } from './pagination';

function* fetchDataGen(chunkSize: number, items: number): any {
  let itemsLeft = items;
  let idx = 0;

  while (itemsLeft > 0) {
    const n = Math.max(0, Math.min(chunkSize, itemsLeft));

    yield new Array(n).fill(0).map((x) => ({
      name: `idx${idx}`,
      value: idx++,
    }));

    itemsLeft -= n;
  }
}

describe('pagination (accumulating)', () => {
  it('should resolve all pages (mod != 0)', async () => {
    const chunkSize = 3;
    const totalCount = 8;

    const fetchDataIterator = fetchDataGen(chunkSize, totalCount);
    const fetchData = () =>
      Promise.resolve({
        data: {
          entries: fetchDataIterator.next().value,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

    const mergeData = jest
      .fn()
      .mockImplementation((data, newData) => [
        ...(data || []),
        ...(newData || []),
      ]);
    const extractDataFromResponse = jest
      .fn()
      .mockImplementation((response) => response?.data?.entries);
    const isEof = jest
      .fn()
      .mockImplementation(
        (response) => (response?.data?.entries?.length || 0) < chunkSize,
      );
    const invokeNextRequest = jest
      .fn()
      .mockImplementation((previousResponse) => fetchData());

    const data = await paginate<Array<any>>(
      mergeData,
      extractDataFromResponse,
      isEof,
      invokeNextRequest,
      0,
      [],
    );

    expect(data).toHaveLength(totalCount);
    expect(data).toEqual([
      { name: 'idx0', value: 0 },
      { name: 'idx1', value: 1 },
      { name: 'idx2', value: 2 },
      { name: 'idx3', value: 3 },
      { name: 'idx4', value: 4 },
      { name: 'idx5', value: 5 },
      { name: 'idx6', value: 6 },
      { name: 'idx7', value: 7 },
    ]);
    expect(mergeData).toHaveBeenCalledTimes(3);
    expect(extractDataFromResponse).toHaveBeenCalledTimes(3);
    expect(isEof).toHaveBeenCalledTimes(3);
    expect(invokeNextRequest).toHaveBeenCalledTimes(3);
  });

  it('should resolve all pages (mod == 0)', async () => {
    const chunkSize = 3;
    const totalCount = 9;

    const fetchDataIterator = fetchDataGen(chunkSize, totalCount);
    const fetchData = () =>
      Promise.resolve({
        data: {
          entries: fetchDataIterator.next().value,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

    const data = await paginate<Array<any>>(
      (data, newData) => [...(data || []), ...(newData || [])],
      (response) => response?.data?.entries,
      (response) => (response?.data?.entries?.length || 0) < chunkSize,
      (previousResponse) => fetchData(),
      0,
      [],
    );

    expect(data).toHaveLength(totalCount);
    expect(data).toEqual([
      { name: 'idx0', value: 0 },
      { name: 'idx1', value: 1 },
      { name: 'idx2', value: 2 },
      { name: 'idx3', value: 3 },
      { name: 'idx4', value: 4 },
      { name: 'idx5', value: 5 },
      { name: 'idx6', value: 6 },
      { name: 'idx7', value: 7 },
      { name: 'idx8', value: 8 },
    ]);
  });

  it('should resolve all pages (count < chunkSize)', async () => {
    const chunkSize = 5;
    const totalCount = 3;

    const fetchDataIterator = fetchDataGen(chunkSize, totalCount);
    const fetchData = () =>
      Promise.resolve({
        data: {
          entries: fetchDataIterator.next().value,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

    const data = await paginate<Array<any>>(
      (data, newData) => [...(data || []), ...(newData || [])],
      (response) => response?.data?.entries,
      (response) => (response?.data?.entries?.length || 0) < chunkSize,
      (previousResponse) => fetchData(),
      0,
      [],
    );

    expect(data).toHaveLength(totalCount);
    expect(data).toEqual([
      { name: 'idx0', value: 0 },
      { name: 'idx1', value: 1 },
      { name: 'idx2', value: 2 },
    ]);
  });

  it('should reject on error', async () => {
    const fetchData = () =>
      Promise.reject({
        data: undefined,
        status: 500,
        statusText: 'ERROR',
        headers: {},
        config: {},
      });

    await expect(
      paginate<Array<any>>(
        (data, newData) => [...(data || []), ...(newData || [])],
        (response) => response?.data?.entries,
        (response) => (response?.data?.entries?.length || 0) < 3,
        (previousResponse) => fetchData(),
        0,
        [],
      ),
    ).rejects.toHaveProperty('status', 500);
  });

  it('should retry on error if retryOnError is provided', async () => {
    const chunkSize = 3;
    const totalCount = 5;

    let errored = false;
    const fetchDataIterator = fetchDataGen(chunkSize, totalCount);
    const fetchData = () => {
      if (!errored) {
        errored = true;
        return Promise.reject({
          data: undefined,
          status: 500,
          statusText: 'ERROR',
          headers: {},
          config: {},
        });
      } else {
        return Promise.resolve({
          data: {
            entries: fetchDataIterator.next().value,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });
      }
    };

    const data = await paginate<Array<any>>(
      (data, newData) => [...(data || []), ...(newData || [])],
      (response) => response?.data?.entries,
      (response) => (response?.data?.entries?.length || 0) < chunkSize,
      (previousResponse) => fetchData(),
      0,
      [],
      (e) => Promise.resolve(true),
    );

    expect(data).toHaveLength(totalCount);
    expect(data).toEqual([
      { name: 'idx0', value: 0 },
      { name: 'idx1', value: 1 },
      { name: 'idx2', value: 2 },
      { name: 'idx3', value: 3 },
      { name: 'idx4', value: 4 },
    ]);
  });
});

describe('pagination (generator)', () => {
  it('should yield all pages (mod !== 0)', async () => {
    const chunkSize = 3;
    const totalCount = 8;

    const fetchDataIterator = fetchDataGen(chunkSize, totalCount);
    const fetchData = () =>
      Promise.resolve({
        data: {
          entries: fetchDataIterator.next().value,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

    const extractDataFromResponse = jest
      .fn()
      .mockImplementation((response) => response?.data?.entries);
    const isEof = jest
      .fn()
      .mockImplementation(
        (response) => (response?.data?.entries?.length || 0) < chunkSize,
      );
    const invokeNextRequest = jest
      .fn()
      .mockImplementation((previousResponse) => fetchData());

    const iterator = paginateGenerator(
      extractDataFromResponse,
      isEof,
      invokeNextRequest,
    );

    let data: any[] = [];

    for await (const chunkData of iterator) {
      data = [...data, ...(chunkData ?? {})];
    }

    expect(data).toHaveLength(totalCount);
    expect(data).toEqual([
      { name: 'idx0', value: 0 },
      { name: 'idx1', value: 1 },
      { name: 'idx2', value: 2 },
      { name: 'idx3', value: 3 },
      { name: 'idx4', value: 4 },
      { name: 'idx5', value: 5 },
      { name: 'idx6', value: 6 },
      { name: 'idx7', value: 7 },
    ]);
    expect(extractDataFromResponse).toHaveBeenCalledTimes(3);
    expect(isEof).toHaveBeenCalledTimes(3);
    expect(invokeNextRequest).toHaveBeenCalledTimes(3);
  });

  it('should resolve all pages (mod == 0)', async () => {
    const chunkSize = 3;
    const totalCount = 9;

    const fetchDataIterator = fetchDataGen(chunkSize, totalCount);
    const fetchData = () =>
      Promise.resolve({
        data: {
          entries: fetchDataIterator.next().value,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

    const iterator = paginateGenerator(
      (response) => response?.data?.entries,
      (response) => (response?.data?.entries?.length || 0) < chunkSize,
      (previousResponse) => fetchData(),
    );

    let data: any[] = [];

    for await (const chunkData of iterator) {
      data = [...data, ...(chunkData ?? [])];
    }

    expect(data).toHaveLength(totalCount);
    expect(data).toEqual([
      { name: 'idx0', value: 0 },
      { name: 'idx1', value: 1 },
      { name: 'idx2', value: 2 },
      { name: 'idx3', value: 3 },
      { name: 'idx4', value: 4 },
      { name: 'idx5', value: 5 },
      { name: 'idx6', value: 6 },
      { name: 'idx7', value: 7 },
      { name: 'idx8', value: 8 },
    ]);
  });

  it('should resolve all pages (count < chunkSize)', async () => {
    const chunkSize = 5;
    const totalCount = 3;

    const fetchDataIterator = fetchDataGen(chunkSize, totalCount);
    const fetchData = () =>
      Promise.resolve({
        data: {
          entries: fetchDataIterator.next().value,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

    const iterator = paginateGenerator(
      (response) => response?.data?.entries,
      (response) => (response?.data?.entries?.length || 0) < chunkSize,
      (previousResponse) => fetchData(),
    );

    let data: any[] = [];

    for await (const chunkData of iterator) {
      data = [...data, ...(chunkData ?? [])];
    }

    expect(data).toHaveLength(totalCount);
    expect(data).toEqual([
      { name: 'idx0', value: 0 },
      { name: 'idx1', value: 1 },
      { name: 'idx2', value: 2 },
    ]);
  });

  it('should throw on error', async () => {
    const fetchData = () =>
      Promise.reject({
        data: undefined,
        status: 500,
        statusText: 'ERROR',
        headers: {},
        config: {},
      });

    const iterator = paginateGenerator(
      (response) => response?.data?.entries,
      (response) => (response?.data?.entries?.length || 0) < 3,
      (previousResponse) => fetchData(),
    );

    await expect(iterator.next()).rejects.toHaveProperty('status', 500);
  });

  it('should retry on error if retryOnError is provided', async () => {
    const chunkSize = 3;
    const totalCount = 5;

    let errored = false;
    const fetchDataIterator = fetchDataGen(chunkSize, totalCount);
    const fetchData = () => {
      if (!errored) {
        errored = true;
        return Promise.reject({
          data: undefined,
          status: 500,
          statusText: 'ERROR',
          headers: {},
          config: {},
        });
      } else {
        return Promise.resolve({
          data: {
            entries: fetchDataIterator.next().value,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });
      }
    };

    const iterator = await paginateGenerator(
      (response) => response?.data?.entries,
      (response) => (response?.data?.entries?.length || 0) < chunkSize,
      (previousResponse) => fetchData(),
      0,
      (e) => Promise.resolve(true),
    );

    let data: any[] = [];

    for await (const chunkData of iterator) {
      data = [...data, ...(chunkData ?? [])];
    }

    expect(data).toHaveLength(totalCount);
    expect(data).toEqual([
      { name: 'idx0', value: 0 },
      { name: 'idx1', value: 1 },
      { name: 'idx2', value: 2 },
      { name: 'idx3', value: 3 },
      { name: 'idx4', value: 4 },
    ]);
  });
});
