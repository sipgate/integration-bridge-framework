import type { AxiosResponse } from 'axios';

export type MergeDataFn<T> = (data: T, newData: T) => T;
export type ExtractDataFromResponseFn<T> = (response: AxiosResponse) => T;
export type IsEofFn = (response: AxiosResponse) => boolean;
export type RetryOnError = (exception: any) => Promise<boolean>;
export type InvokeNextRequestFn = (
  previousResponse: AxiosResponse | undefined,
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

  while (!response || !isEof(response)) {
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
  }
}

export async function paginate<T>(
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
