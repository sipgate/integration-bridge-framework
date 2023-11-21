import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
const apikey = process.env.BACKEND_TRACING_API_KEY;

const googleExporter = new OTLPTraceExporter({
  url: 'https://gateway.clinq.com/backend-traces',
  headers: {
    apikey,
  },
});

// const jaegerExporter = new OTLPTraceExporter({});

export const otelSDK = new NodeSDK({
  spanProcessor: new SimpleSpanProcessor(googleExporter),
  serviceName: 'bridge.' + (process.env.INTEGRATION_NAME || 'integration'),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

export const tracingEnabled = !!apikey;

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
