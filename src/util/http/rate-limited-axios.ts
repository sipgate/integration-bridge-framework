import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { infoLogger } from '../logger.util';

const DEFAULT_KEY = 'DEFAULT_KEY';

export class RateLimitedAxios {
  rateLimiter: RateLimiterMemory;
  enableLogging: boolean;
  constructor(
    allowedCalls: number,
    intervall: number,
    enableLogging: boolean = false,
  ) {
    this.rateLimiter = new RateLimiterMemory({
      points: allowedCalls,
      duration: intervall,
    });
    this.enableLogging = enableLogging;
  }

  async checkRateLimitAndWait(key?: string) {
    try {
      if (key) await this.rateLimiter.consume(key, 1);
      else await this.rateLimiter.consume(DEFAULT_KEY, 1);
    } catch (rateLimiterRes: any) {
      if (this.enableLogging) {
        infoLogger(
          'checkRateLimitAndWait',
          `Waiting ${rateLimiterRes.msBeforeNext} to respect rate limit`,
          key ? key : '',
        );
      }
      await new Promise((resolve) => {
        setTimeout(resolve, rateLimiterRes.msBeforeNext);
      });
      await this.checkRateLimitAndWait(key);
    }
  }

  async get<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>,
    key?: string,
  ): Promise<R> {
    await this.checkRateLimitAndWait(key);
    return axios.get(url, config);
  }

  async delete<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>,
    key?: string,
  ): Promise<R> {
    await this.checkRateLimitAndWait(key);
    return axios.delete(url, config);
  }

  async post<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
    key?: string,
  ): Promise<R> {
    await this.checkRateLimitAndWait(key);
    return axios.post(url, data, config);
  }

  async put<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
    key?: string,
  ): Promise<R> {
    await this.checkRateLimitAndWait(key);
    return axios.put(url, data, config);
  }

  async patch<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>,
    key?: string,
  ): Promise<R> {
    await this.checkRateLimitAndWait(key);
    return axios.patch(url, data, config);
  }
}

export function useRateLimitInterceptor(
  axiosInstance: AxiosInstance,
  allowedCalls: number,
  intervalSeconds: number,
  enableLogging: boolean = false,
  key: string = DEFAULT_KEY,
) {
  const rateLimiter = new RateLimiterMemory({
    points: allowedCalls,
    duration: intervalSeconds,
  });

  const checkRateLimitAndWait = async () => {
    try {
      await rateLimiter.consume(key, 1);
    } catch (rateLimiterRes: any) {
      enableLogging &&
        infoLogger(
          'checkRateLimitAndWait',
          `Waiting ${rateLimiterRes.msBeforeNext} to respect rate limit`,
          key ? key : '',
        );

      await new Promise((resolve) => {
        setTimeout(resolve, rateLimiterRes.msBeforeNext);
      });

      await checkRateLimitAndWait();
    }
  };

  const requestHandler = async (config: InternalAxiosRequestConfig) => {
    await checkRateLimitAndWait();
    return config;
  };

  axiosInstance.interceptors.request.use(requestHandler);

  return axiosInstance;
}

export function useRetryOnErrorInterceptor(
  axiosInstance: AxiosInstance,
  retriesPerCall: number = 2,
  retryCountHeader: string = 'X-CSR-Retry-Count',
) {
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
    (error: AxiosError) => {
      console.log(
        'CAUGHT ERROR',
        error.config?.url,
        error.config?.params,
        retriesPerCall,
      );

      if (
        error.config &&
        error.config.headers[retryCountHeader] !== undefined &&
        parseInt(error.config.headers[retryCountHeader]) < retriesPerCall
      ) {
        console.log('RETRYING');
        return axiosInstance.request(error.config);
      }

      console.log('BAILOUT');

      return Promise.reject(error);
    },
  );

  return axiosInstance;
}
