var builder = DistributedApplication.CreateBuilder(args);

// Add PostgreSQL database
var postgres = builder.AddPostgres("postgres")
                      .WithPgAdmin() // Adds PgAdmin for DB management
                      .AddDatabase("postgresdb");

// Add Backend API and inject Postgres connection
var backend = builder.AddProject<Projects.Club_Abacus_System>("backend")
                     .WithHttpEndpoint(port: 5001, targetPort: 5000, env: "ASPNETCORE_HTTP_PORTS", name: "http")
                     .WithReference(postgres)
                     .WaitFor(postgres);

// Bypass npm.cmd entirely and run vite directly via node.exe
builder.AddNodeApp("frontend", "../frontend/node_modules/vite/bin/vite.js")
       .WithWorkingDirectory("../frontend")
       .WithReference(backend)
       .WaitFor(backend)
       .WithEnvironment("VITE_API_BASE_URL", backend.GetEndpoint("http"))
       .WithHttpEndpoint(env: "PORT", port: 5173);

builder.Build().Run();
