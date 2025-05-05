import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PubSubInstrumentation } from 'opentelemetry-instrumentation-pubsub';
const apikey = process.env.BACKEND_TRACING_API_KEY;
const tracingEnabledEnv = process.env.BACKEND_TRACING_ENABLED;

const googleExporter = new OTLPTraceExporter({
  url: 'http://opentelemetry-collector.monitoring.svc.cluster.local:4318/v1/traces',
});

// const jaegerExporter = new OTLPTraceExporter({});

export const otelSDK = new NodeSDK({
  spanProcessor: new SimpleSpanProcessor(googleExporter),
  serviceName: 'bridge.' + (process.env.INTEGRATION_NAME || 'integration'),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new PubSubInstrumentation(),
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

export const tracingEnabled = !!apikey || tracingEnabledEnv === 'true';

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(
      () => console.log('SDK shut down successfully'),
      (err) => console.log('Error shutting down SDK', err),
    )
    .finally(() => process.exit(0));
});
