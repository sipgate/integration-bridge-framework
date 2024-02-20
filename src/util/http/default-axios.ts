import { AxiosInstance } from 'axios';
import { RateLimitConfig, useRateLimitInterceptor } from './rate-limited-axios';
import { RetryConfig, useRetryOnErrorInterceptor } from './retrying-axios';

export function useDefaultInterceptors(
  axiosInstance: AxiosInstance,
  rateLimitConfig: RateLimitConfig,
  retryConfig: RetryConfig,
): AxiosInstance {
  return useRateLimitInterceptor(
    useRetryOnErrorInterceptor(axiosInstance, retryConfig),
    rateLimitConfig,
  );
}
