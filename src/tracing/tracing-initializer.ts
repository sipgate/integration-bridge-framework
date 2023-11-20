import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

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
