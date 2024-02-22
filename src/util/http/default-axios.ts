import { AxiosInstance } from 'axios';
import { RateLimitConfig, useRateLimitInterceptor } from './rate-limited-axios';
import { RetryConfig, useRetryOnErrorInterceptor } from './retrying-axios';
import { randomUUID } from 'crypto';

export function useDefaultInterceptors(
  axiosInstance: AxiosInstance,
  rateLimitConfig: RateLimitConfig,
  retryConfig: RetryConfig,
  key?: string,
): AxiosInstance {
  const effectiveKey = key || randomUUID();

  return useRateLimitInterceptor(
    useRetryOnErrorInterceptor(axiosInstance, retryConfig, effectiveKey),
    rateLimitConfig,
    effectiveKey,
  );
}
