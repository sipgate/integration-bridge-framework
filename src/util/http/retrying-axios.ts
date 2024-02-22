import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { infoLogger, warnLogger } from '../logger.util';
import { delay } from '../lang/delay';
import { randomUUID } from 'crypto';

export type RetryDecision = {
  retryDesired: boolean;
  delayMs?: number;
};

export type RetryDecider = (
  error: AxiosError,
  retryCount: number,
) => RetryDecision;

export type RetryConfig = {
  retryDecider: RetryDecider;
  retryCountHeader?: string;
};

function formatAxiosErrorForLogging(error: AxiosError) {
  return {
    code: error.code,
    message: error.message,
    stack: error.stack,
    method: error.config?.method,
    url: error.config?.url,
    responseStatus: error.response?.status,
    responseStatusText: error.response?.statusText,
    responseHeaders: { ...error.response?.headers },
    responseData: error.response?.data,
  };
}

export function useRetryOnErrorInterceptor(
  axiosInstance: AxiosInstance,
  config: RetryConfig,
  key?: string,
): AxiosInstance {
  const effectiveKey = key || randomUUID();
  const retryCountHeader =
    config.retryCountHeader || 'X-SipgateIntegration-RetryCount';

  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (config.headers[retryCountHeader] !== undefined) {
        config.headers[retryCountHeader] =
          parseInt(config.headers[retryCountHeader]) + 1;
      } else {
        config.headers[retryCountHeader] = 0;
      }

      return config;
    },
  );

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const retryCount: number | undefined =
        error.config && error.config.headers[retryCountHeader] !== undefined
          ? parseInt(error.config.headers[retryCountHeader])
          : undefined;

      if (retryCount !== undefined) {
        const { retryDesired, delayMs } = config.retryDecider(
          error,
          retryCount,
        );

        if (retryDesired && error.config) {
          infoLogger(
            'axiosRetryInterceptor',
            'request was not successful - will retry',
            effectiveKey,
            {
              status: error.response?.status,
              retryCount,
              delayMs,
            },
          );

          delayMs && (await delay(delayMs));

          return axiosInstance.request(error.config);
        }
      }

      warnLogger(
        'axiosRetryInterceptor',
        'request finally failed with error',
        effectiveKey,
        {
          error: formatAxiosErrorForLogging(error),
          retryCount,
        },
      );

      return Promise.reject(error);
    },
  );

  return axiosInstance;
}
