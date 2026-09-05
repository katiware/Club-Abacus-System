namespace Club_Abacus_System.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly string _baseUploadsPath;

    public LocalFileStorageService(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var configuredPath = configuration["Storage:LocalPath"];
        if (string.IsNullOrWhiteSpace(configuredPath))
        {
            _baseUploadsPath = Path.Combine(environment.ContentRootPath, "Uploads");
        }
        else if (Path.IsPathRooted(configuredPath))
        {
            _baseUploadsPath = configuredPath;
        }
        else
        {
            _baseUploadsPath = Path.Combine(environment.ContentRootPath, configuredPath);
        }

        if (!Directory.Exists(_baseUploadsPath))
        {
            Directory.CreateDirectory(_baseUploadsPath);
        }
    }

    public async Task<string> SaveFileAsync(Stream stream, string originalFileName, string subDirectory, CancellationToken cancellationToken = default)
    {
        var sanitizedSubDir = subDirectory.Replace('\\', '/').Trim('/');
        var targetDir = Path.Combine(_baseUploadsPath, sanitizedSubDir);
        
        EnsureDirectoryInsideBase(targetDir);

        if (!Directory.Exists(targetDir))
        {
            Directory.CreateDirectory(targetDir);
        }

        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();
        var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(targetDir, uniqueFileName);

        using (var outputStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            await stream.CopyToAsync(outputStream, cancellationToken);
        }

        var storageKey = string.IsNullOrEmpty(sanitizedSubDir) 
            ? uniqueFileName 
            : $"{sanitizedSubDir}/{uniqueFileName}";

        return storageKey;
    }

    public Task<(Stream Stream, string ContentType, string DownloadFileName)?> GetFileAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var sanitizedKey = storageKey.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(_baseUploadsPath, sanitizedKey);

        EnsureDirectoryInsideBase(fullPath);

        if (!File.Exists(fullPath))
        {
            return Task.FromResult<(Stream Stream, string ContentType, string DownloadFileName)?>(null);
        }

        var contentType = GetContentType(fullPath);
        var downloadFileName = Path.GetFileName(fullPath);
        Stream fileStream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);

        return Task.FromResult<(Stream Stream, string ContentType, string DownloadFileName)?>((fileStream, contentType, downloadFileName));
    }

    public Task<bool> DeleteFileAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var sanitizedKey = storageKey.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(_baseUploadsPath, sanitizedKey);

        EnsureDirectoryInsideBase(fullPath);

        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            return Task.FromResult(true);
        }

        return Task.FromResult(false);
    }

    private void EnsureDirectoryInsideBase(string fullPath)
    {
        var normalizedBase = Path.GetFullPath(_baseUploadsPath).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var normalizedTarget = Path.GetFullPath(fullPath);

        if (!normalizedTarget.StartsWith(normalizedBase, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("不正なストレージパスアクセスが検出されました。");
        }
    }

    private static string GetContentType(string filePath)
    {
        var extension = Path.GetExtension(filePath).ToLowerInvariant();
        return extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };
    }
}
