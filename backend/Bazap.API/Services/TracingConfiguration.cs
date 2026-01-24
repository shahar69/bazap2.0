using OpenTelemetry;
using OpenTelemetry.Exporter;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Bazap.API.Services;

/// <summary>
/// OpenTelemetry tracing configuration for the Bazap API
/// Configured to export traces to AI Toolkit on localhost:4317 (gRPC)
/// </summary>
public static class TracingConfiguration
{
    public static void AddBazapTracing(this WebApplicationBuilder builder)
    {
        var resourceBuilder = ResourceBuilder.CreateDefault()
            .AddService(
                serviceName: "bazap-api",
                serviceVersion: "2.0.0",
                serviceInstanceId: Environment.MachineName
            )
            .AddAttributes(new Dictionary<string, object>
            {
                { "environment", "development" },
                { "deployment.environment", "local" }
            });

        builder.Services.AddOpenTelemetry()
            .ConfigureResource(r => r.AddDetector(new AppResourceDetector(resourceBuilder)))
            .WithTracing(builder =>
            {
                builder
                    .SetResourceBuilder(resourceBuilder)
                    .AddAspNetCoreInstrumentation(options =>
                    {
                        // Record request body and response body for inspection endpoint
                        options.RecordException = true;
                        options.EnrichWithHttpRequest = (activity, httpRequest) =>
                        {
                            activity.SetTag("http.request.path", httpRequest.Path);
                            activity.SetTag("http.request.method", httpRequest.Method);
                        };
                        options.EnrichWithHttpResponse = (activity, httpResponse) =>
                        {
                            activity.SetTag("http.response.status_code", httpResponse.StatusCode);
                        };
                    })
                    .AddHttpClientInstrumentation(options =>
                    {
                        options.RecordException = true;
                    })
                    // Export to AI Toolkit OTLP endpoint
                    .AddOtlpExporter(options =>
                    {
                        options.Endpoint = new Uri("http://localhost:4317");
                        options.Protocol = OtlpExportProtocol.Grpc;
                    });
            });
    }
}

/// <summary>
/// Custom resource detector to provide additional context
/// </summary>
public class AppResourceDetector : IResourceDetector
{
    private readonly ResourceBuilder _resourceBuilder;

    public AppResourceDetector(ResourceBuilder resourceBuilder)
    {
        _resourceBuilder = resourceBuilder;
    }

    public Resource Detect()
    {
        return _resourceBuilder.Build();
    }
}
