import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { infoLogger } from '../logger.util';
import { delay } from '../lang/delay';

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
): AxiosInstance {
  const retryCountHeader = config.retryCountHeader || 'X-CSR-Retry-Count';

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

      infoLogger('axiosRetryInterceptor', 'caught error', undefined, {
        error: formatAxiosErrorForLogging(error),
        retryCount,
      });

      if (retryCount !== undefined) {
        const { retryDesired, delayMs } = config.retryDecider(
          error,
          retryCount,
        );

        if (retryDesired && error.config) {
          infoLogger('axiosRetryInterceptor', 'retry desired', undefined, {
            delayMs,
          });

          delayMs && (await delay(delayMs));

          return axiosInstance.request(error.config);
        }
      }

      return Promise.reject(error);
    },
  );

  return axiosInstance;
}
