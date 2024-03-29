import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { infoLogger } from '../logger.util';
import { randomUUID } from 'crypto';

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

export type RateLimitConfig = {
  allowedCalls: number;
  intervalSeconds: number;
  enableLogging?: boolean;
};

export function useRateLimitInterceptor(
  axiosInstance: AxiosInstance,
  config: RateLimitConfig,
  key?: string,
): AxiosInstance {
  const effectiveKey = key || randomUUID();
  const enableLogging = !!config.enableLogging;

  const rateLimiter = new RateLimiterMemory({
    points: config.allowedCalls,
    duration: config.intervalSeconds,
  });

  const checkRateLimitAndWait = async () => {
    try {
      await rateLimiter.consume(effectiveKey, 1);
    } catch (rateLimiterRes: any) {
      enableLogging &&
        infoLogger(
          'axiosRateLimitInterceptor',
          `Waiting ${rateLimiterRes.msBeforeNext} to respect rate limit`,
          effectiveKey,
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
