using Club_Abacus_System.Data;
using Club_Abacus_System.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// --- Identity と Googleログイン の設定 ---
builder.Services.AddIdentity<User, Role>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddAuthentication()
    .AddGoogle(options =>
    {
        // TODO: appsettings.json や 環境変数 から読み込むように変更する
        options.ClientId = builder.Configuration["Authentication:Google:ClientId"] ?? "dummy-client-id";
        options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"] ?? "dummy-client-secret";
    });

// --- 権限チェック（認可）の設定 ---
builder.Services.AddAuthorization(options =>
{
    // PermissionType Enum のすべての値をポリシーとして自動登録
    foreach (var permission in Enum.GetValues<PermissionType>())
    {
        options.AddPolicy(permission.ToString(), policy =>
            policy.RequireClaim("Permission", permission.ToString()));
    }
});

//swagger(実装時には実行されないようにする)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


// Configure CORS for local React frontend development (e.g., Vite dev server on port 5173)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});


// PostgreSQL 接続設定（appsettings.json のデータベース接続文字列を使用）
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString(
            "DefaultConnection")));

var app = builder.Build();

//swagger UI(実装時には実行されないようにする)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Club Abacus System API v1");
});


// Configure the HTTP request pipeline.
app.UseCors();

app.UseAuthorization();
app.MapControllers();

// Simple endpoint for connection test
app.MapGet("/api/health", () => new { Status = "OK", Message = "Backend API is running smoothly!" });

app.Run();
