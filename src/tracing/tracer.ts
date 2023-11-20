import { ROOT_CONTEXT, Span, propagation, trace } from '@opentelemetry/api';
import { infoLogger } from '../util/logger.util';

export class Tracer {
  private span: Span;

  constructor(
    task: string,
    traceparent: string,
    private readonly userIdentifier: string,
  ) {
    const context = propagation.extract(
      ROOT_CONTEXT,
      { traceparent },
      {
        get: (carrier: any, key) => {
          return carrier[key];
        },
        keys: (carrier) => {
          return Object.keys(carrier);
        },
      },
    );

    this.span = trace.getTracer('default').startSpan(task, undefined, context);
    this.span.setAttribute('userId', this.userIdentifier);
    infoLogger(
      'Tracer',
      `Start ${task} with trace: ${this.span.spanContext().traceId}`,
      this.userIdentifier,
    );
  }

  getTraceParent() {
    const traceHeader: { traceparent: undefined | string } = {
      traceparent: undefined,
    };

    const context = trace.setSpan(ROOT_CONTEXT, this.span);
    propagation.inject(context, traceHeader, {
      set: (carrier: any, key, value) => {
        carrier[key] = value;
      },
    });

    return traceHeader['traceparent'] || '';
  }

  endSpan() {
    this.span.end();
  }

  fork(task: string) {
    const tracerFork = new Tracer(
      task,
      this.getTraceParent(),
      this.userIdentifier,
    );
    return tracerFork;
  }

  async do(process: () => Promise<any>) {
    try {
      const response = await process();
      return response;
    } catch (error) {
      this.setError((error as Error).message);
      throw error;
    } finally {
      this.endSpan();
    }
  }

  setError(error: string) {
    this.span.recordException(error);
    this.span.setStatus({ code: 2, message: 'FAILED' });
  }

  logWarning(warning: string) {
    this.span.addEvent('warning', { message: warning });
  }

  logInfo(info: string) {
    this.span.addEvent('info', { message: info });
  }
}
