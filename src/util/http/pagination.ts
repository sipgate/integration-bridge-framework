import type { AxiosResponse } from 'axios';

export type MergeDataFn<T> = (data: T, newData: T) => T;
export type ExtractDataFromResponseFn<T> = (response: AxiosResponse) => T;
export type IsEofFn = (response: AxiosResponse) => boolean;
export type IsEofFnLegacy<T> = (response: AxiosResponse, data?: T) => boolean;
export type RetryOnError = (exception: any) => Promise<boolean>;
export type InvokeNextRequestFn = (
  previousResponse: AxiosResponse | undefined,
) => Promise<AxiosResponse>;
export type InvokeNextRequestFnLegacy<T> = (
  previousResponse: AxiosResponse | undefined,
  data?: T,
) => Promise<AxiosResponse>;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve, reject) =>
    setTimeout(() => resolve(undefined), ms || 0),
  );
}

export async function* paginateGenerator<T>(
  extractDataFromResponse: ExtractDataFromResponseFn<T>,
  isEof: IsEofFn,
  invokeNextRequest: InvokeNextRequestFn,
  retryOnError?: RetryOnError,
) {
  let response: AxiosResponse | undefined;

  //while (!response || !isEof(response)) {
  do {
    try {
      const newResponse = await invokeNextRequest(response);
      const responseData = extractDataFromResponse(newResponse);

      response = newResponse; // NOTE: due to potential retry (from within catch below), reassign response only as a last step
      yield responseData;
    } catch (e: any) {
      if (retryOnError && (await retryOnError(e))) {
        continue;
      } else {
        console.error('[paginate] Error during pagination', `${e}`);
        throw e;
      }
    }
  } while (response && !isEof(response));
}

export async function paginatex<T>(
  mergeData: MergeDataFn<T>,
  extractDataFromResponse: ExtractDataFromResponseFn<T>,
  isEof: IsEofFn,
  invokeNextRequest: InvokeNextRequestFn,
  delayMs: number,
  initialData: T,
  retryOnError?: RetryOnError,
): Promise<T> {
  let data = initialData;
  let done = false;

  const pageIter = paginateGenerator(
    extractDataFromResponse,
    isEof,
    invokeNextRequest,
    retryOnError,
  );

  do {
    const result = await pageIter.next();

    done = result.done!;

    if (!done) {
      data = mergeData(data, result.value!);

      if (delayMs && !done) {
        await sleep(delayMs);
      }
    }
  } while (!done);

  return data;
}

export async function paginate<T>(
  mergeData: MergeDataFn<T>,
  extractDataFromResponse: ExtractDataFromResponseFn<T>,
  isEof: IsEofFnLegacy<T>,
  invokeNextRequest: InvokeNextRequestFnLegacy<T>,
  delayMs: number,
  initialData: T,
  retryOnError?: RetryOnError,
): Promise<T> {
  const paginateId = Math.floor(Math.random() * 100000);

  return new Promise<T>((resolve, reject) => {
    const fetchNextPage = async (data: T, previousResponse?: AxiosResponse) => {
      try {
        if (previousResponse && delayMs) {
          await sleep(delayMs);
        }

        const response = await invokeNextRequest(previousResponse, data);
        const responseData = extractDataFromResponse(response);
        const allData = mergeData(data, responseData);

        if (!isEof(response, allData)) {
          setImmediate(() => fetchNextPage(allData, response));
        } else {
          resolve(allData);
        }
      } catch (e: any) {
        if (retryOnError && (await retryOnError(e))) {
          setImmediate(() => fetchNextPage(data, previousResponse));
        } else {
          console.error('[paginate] Error during pagination', `${e}`);
          reject(e);
        }
      }
    };

    console.log(`[paginate] ${paginateId} start`);
    return fetchNextPage(initialData);
  }).then((resultData: T): T => {
    console.log(`[paginate] ${paginateId} end`);

    return resultData;
  });
}
