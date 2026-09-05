namespace Club_Abacus_System.Services;

public interface IFileStorageService
{
    /// <summary>
    /// ストリームからファイルを安全に保存し、ストレージキーを返却します。
    /// </summary>
    Task<string> SaveFileAsync(Stream stream, string originalFileName, string subDirectory, CancellationToken cancellationToken = default);

    /// <summary>
    /// ストレージキーを元にファイルストリームを取得します。
    /// </summary>
    Task<(Stream Stream, string ContentType, string DownloadFileName)?> GetFileAsync(string storageKey, CancellationToken cancellationToken = default);

    /// <summary>
    /// ストレージ上のファイルを削除します。
    /// </summary>
    Task<bool> DeleteFileAsync(string storageKey, CancellationToken cancellationToken = default);
}
