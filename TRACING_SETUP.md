# OpenTelemetry Tracing Setup - Bazap 2.0

## Overview

OpenTelemetry tracing has been integrated into the Bazap 2.0 application (frontend and backend) to provide comprehensive observability of the inspection workflow and API calls.

## Architecture

### Frontend (React/TypeScript)
- **Location**: `frontend/src/tracing.ts`
- **Exports traces to**: `http://localhost:4318/v1/traces` (AI Toolkit)
- **Instrumentation**:
  - Fetch API calls
  - XMLHttpRequest calls
  - Manual spans in API client for detailed operation tracking

### Backend (.NET 8)
- **Location**: `backend/Bazap.API/Services/TracingConfiguration.cs`
- **Exports traces to**: `http://localhost:4317` (gRPC, AI Toolkit)
- **Instrumentation**:
  - ASP.NET Core HTTP requests
  - HTTP client calls
  - Manual spans for service operations

## Key Features

### Frontend Tracing (`apiClient.ts`)
Each API call is wrapped in a span with detailed attributes:

```typescript
tracer.startActiveSpan('inspectionApi.makeDecision', async (span) => {
  span.setAttributes({
    'inspection.item_id': eventItemId,
    'inspection.decision': decision,
    'inspection.disable_reason': disableReason || 'none',
    'inspection.has_notes': !!notes,
  });
  // ... API call
})
```

**Traced Operations**:
- Event creation, retrieval, updates
- Item management (add/remove/complete)
- Inspection decisions
- Label generation and batch printing
- Item search queries

### Backend Tracing
The `.NET` backend automatically traces:
- **HTTP Requests**: All incoming ASP.NET Core requests with:
  - HTTP method and path
  - Response status code
  - Request/response enrichment
- **Service Operations**: Inspection decisions, event status changes, database operations
- **Exceptions**: Errors are recorded with full exception data

## Getting Started

### Prerequisites
1. AI Toolkit installed in VS Code
2. Backend and frontend should be running with tracing enabled

### Starting the Trace Viewer
```
Command: ai-mlstudio.tracing.open
```
This opens the trace viewer and starts the local OTLP collector.

### Running the Application

**Terminal 1 - Start Backend**:
```bash
cd backend/Bazap.API
dotnet run
```
You should see:
```
📡 OpenTelemetry tracing configured - exporting to http://localhost:4317
```

**Terminal 2 - Start Frontend**:
```bash
cd frontend
npm run dev
```
The frontend will initialize tracing and log:
```
✅ OpenTelemetry tracing initialized for frontend
📡 Traces will be sent to http://localhost:4318
```

### Viewing Traces
1. Open the AI Toolkit Trace Viewer (shown automatically when you run `ai-mlstudio.tracing.open`)
2. Use the frontend application - make events, add items, perform inspections
3. Traces appear in real-time in the viewer
4. Click on spans to see:
   - Operation name
   - Duration
   - Attributes (parameters, results)
   - Exception information
   - Parent-child relationships

## Trace Attributes

### Frontend Spans
- `event.source_unit` - Event source
- `event.receiver` - Event recipient
- `event.type` - Event type (Receiving, Inspection, Outgoing)
- `event.id` - Event ID
- `event.status` - Event status
- `item.makat` - Item SKU
- `item.name` - Item name
- `item.quantity` - Item quantity
- `inspection.decision` - Pass or Disabled
- `inspection.disable_reason` - Reason for disabling
- `inspection.has_notes` - Whether notes were included
- `label.copies` - Number of labels to print
- `inspection.batch_size` - Batch operations count

### Backend Spans
- `http.request.path` - Request path
- `http.request.method` - HTTP method
- `http.response.status_code` - Response status
- Service-specific attributes for business operations

## Performance Impact

- **Batch Processing**: Spans are batched before export (default 512 spans or 5 seconds)
- **Console Output**: Also logged to browser console for development
- **No Request Blocking**: Tracing is asynchronous and non-blocking
- **Fallback**: If tracing fails to initialize, the application continues normally

## Troubleshooting

### Traces not appearing
1. Ensure AI Toolkit Trace Viewer is running (`ai-mlstudio.tracing.open`)
2. Verify endpoints:
   - Frontend: `http://localhost:4318/v1/traces`
   - Backend: `http://localhost:4317` (gRPC)
3. Check browser console for errors (prefix: `Failed to initialize tracing`)
4. Check .NET console for OpenTelemetry startup messages

### High latency
- This is expected in development with console span processor enabled
- Remove `ConsoleSpanExporter` in production for better performance

### Missing traces for specific operations
1. Ensure the operation is wrapped in `tracer.startActiveSpan()`
2. Check that attributes are being set correctly
3. Verify span names are descriptive (used in filtering)

## File Structure

```
frontend/
  src/
    tracing.ts           # Frontend tracing initialization
    services/
      apiClient.ts       # Wrapped API calls with spans
    main.tsx             # Calls initializeTracing()

backend/
  Bazap.API/
    Services/
      TracingConfiguration.cs  # .NET tracing setup
    Program.cs                 # Integrates tracing into DI
```

## Future Enhancements

1. **Custom Metrics**: Add OpenTelemetry metrics for performance tracking
2. **Database Instrumentation**: Trace EF Core database operations
3. **Distributed Tracing**: Correlate frontend and backend traces via trace IDs
4. **Sampling**: Implement sampling strategy for production
5. **Log Integration**: Integrate with structured logging for correlation

## References

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry Protocol Exporter](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/exporter-trace-otlp-http)
- [OpenTelemetry .NET](https://github.com/open-telemetry/opentelemetry-dotnet)
- [AI Toolkit Tracing](https://github.com/Azure/vscode-aitk)
