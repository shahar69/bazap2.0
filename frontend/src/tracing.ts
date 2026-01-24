import { trace } from '@opentelemetry/api';
import { WebTracerProvider, BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

/**
 * Initialize OpenTelemetry tracing for the frontend
 * Traces all HTTP requests and API calls
 */
export function initializeTracing() {
  try {
    // Create the trace provider
    const tracerProvider = new WebTracerProvider();

    // Export traces to the AI Toolkit (running on localhost:4318)
    const otlpExporter = new OTLPTraceExporter({
      url: 'http://localhost:4318/v1/traces',
    });

    // Add batch processor to send traces efficiently
    (tracerProvider as any).addSpanProcessor(new BatchSpanProcessor(otlpExporter));

    // Also log to console for development
    (tracerProvider as any).addSpanProcessor(new BatchSpanProcessor(new ConsoleSpanExporter()));

    // Set as global provider
    trace.setGlobalTracerProvider(tracerProvider);

    // Instrument HTTP requests (Fetch API and XMLHttpRequest)
    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          enabled: true,
        }),
        new XMLHttpRequestInstrumentation({
          enabled: true,
        }),
      ],
    });

    console.log('✅ OpenTelemetry tracing initialized for frontend');
    console.log('📡 Traces will be sent to http://localhost:4318');
  } catch (error) {
    console.error('Failed to initialize tracing:', error);
    // Don't throw - allow app to continue even if tracing fails
  }
}
