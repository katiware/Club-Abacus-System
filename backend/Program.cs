using Club_Abacus_System.Data;
using Club_Abacus_System.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// --- Identity と JWT認証 の設定 ---
builder.Services.AddIdentity<User, Role>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

var jwtKey = builder.Configuration["Jwt:Key"] ?? "super-secret-key-for-development-only-change-in-production";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "ClubAbacusSystem",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "ClubAbacusSystemUsers",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
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

if (app.Environment.IsDevelopment())
{
    // 開発環境専用のモック認証ミドルウェア（本番環境では絶対に入らない）
    // フロントエンド開発やSwaggerでのテスト時に、常に全権限を持った管理者としてAPIを叩けるようにします
    // ※ ログイン機能テストのため、一時的にコメントアウト
    /*
    app.Use(async (context, next) =>
    {
        var claims = new List<System.Security.Claims.Claim>
        {
            new("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", Guid.Empty.ToString()),
            new("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name", "Dev Admin")
        };

        // 全てのPermissionを付与
        foreach (var permission in Enum.GetValues<Club_Abacus_System.Models.PermissionType>())
        {
            claims.Add(new("Permission", permission.ToString()));
        }

        var identity = new System.Security.Claims.ClaimsIdentity(claims, "DevMockAuth");
        context.User = new System.Security.Claims.ClaimsPrincipal(identity);

        await next(context);
    });
    */
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Simple endpoint for connection test
app.MapGet("/api/health", () => new { Status = "OK", Message = "Backend API is running smoothly!" });

app.Run();
