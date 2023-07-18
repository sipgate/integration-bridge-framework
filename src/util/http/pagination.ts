import { AxiosResponse } from 'axios';

export type MergeDataFn<T> = (data: T, newData: T) => T;
export type ExtractDataFromResponseFn<T> = (response: AxiosResponse) => T;
export type IsEofFn<T> = (response: AxiosResponse, data: T) => boolean;
export type RetryOnError = (exception: any) => Promise<boolean>;
export type InvokeNextRequestFn<T> = (
  previousResponse: AxiosResponse | undefined,
  data: T,
) => Promise<AxiosResponse>;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve, reject) =>
    setTimeout(() => resolve(undefined), ms || 0),
  );
}

export async function paginate<T>(
  mergeData: MergeDataFn<T>,
  extractDataFromResponse: ExtractDataFromResponseFn<T>,
  isEof: IsEofFn<T>,
  invokeNextRequest: InvokeNextRequestFn<T>,
  delayMs: number,
  initialData: T,
  retryOnError?: RetryOnError,
): Promise<T> {
  const paginateId = Math.floor(Math.random() * 100000);

  return new Promise<T>((resolve, reject) => {
    const fetchNextPage = async (data: T, previousResponse?: AxiosResponse) => {
      try {
        if (previousResponse) {
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
