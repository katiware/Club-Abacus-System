using System.IO.Compression;
using Club_Abacus_System.Data;
using Club_Abacus_System.Models;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Services;

public class DocumentExportService(IExpenseDocumentService expenseDocumentService, AppDbContext context) : IDocumentExportService
{
    public async Task<Stream> ExportDocumentsToZipAsync(Guid requestId, Guid currentUserId, bool hasAdminAccess)
    {
        return await ExportMultipleDocumentsToZipAsync(new[] { requestId }, currentUserId, hasAdminAccess);
    }

    public async Task<Stream> ExportMultipleDocumentsToZipAsync(IEnumerable<Guid> requestIds, Guid currentUserId, bool hasAdminAccess)
    {
        var requestIdList = requestIds.Distinct().ToList();
        if (!requestIdList.Any())
        {
            throw new ArgumentException("エクスポート対象の申請IDが指定されていません。");
        }

        var requestsQuery = context.ExpenseRequests
            .Include(e => e.User)
            .Include(e => e.ExpenseDocuments)
            .Where(e => requestIdList.Contains(e.Id));

        if (!hasAdminAccess)
        {
            requestsQuery = requestsQuery.Where(e => e.UserId == currentUserId);
        }

        var requests = await requestsQuery.ToListAsync();
        if (!requests.Any())
        {
            throw new KeyNotFoundException("対象の申請が見つかりません。");
        }

        var memoryStream = new MemoryStream();
        bool hasAnyFile = false;

        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            int index = 1;
            foreach (var req in requests)
            {
                var activeDocs = req.ExpenseDocuments.Where(d => d.DeletedAt == null).ToList();
                if (!activeDocs.Any()) continue;

                var safeTitle = string.Join("_", req.Title.Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries));
                if (string.IsNullOrWhiteSpace(safeTitle)) safeTitle = "申請";
                var safeUserName = string.Join("_", (req.User?.Name ?? "部員").Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries));

                string baseFolder = requests.Count > 1 
                    ? $"{index:D2}_{safeUserName}_{safeTitle}" 
                    : "";

                foreach (var doc in activeDocs)
                {
                    try
                    {
                        var (fileStream, _, fileName) = await expenseDocumentService.GetDocumentFileAsync(req.Id, doc.Id, currentUserId, hasAdminAccess);
                        using (fileStream)
                        {
                            var folderName = GetFolderNameByDocumentType(doc.DocumentType);
                            var entryPath = string.IsNullOrEmpty(baseFolder) 
                                ? $"{folderName}/{fileName}" 
                                : $"{baseFolder}/{folderName}/{fileName}";

                            var entry = archive.CreateEntry(entryPath);
                            using var entryStream = entry.Open();
                            await fileStream.CopyToAsync(entryStream);
                            hasAnyFile = true;
                        }
                    }
                    catch (Exception)
                    {
                        // 個別ファイルの読み込み失敗時はスキップして処理を継続
                    }
                }
                index++;
            }
        }

        if (!hasAnyFile)
        {
            throw new KeyNotFoundException("エクスポート可能な証憑ファイルが見つかりません。");
        }

        memoryStream.Position = 0;
        return memoryStream;
    }

    private string GetFolderNameByDocumentType(DocumentType documentType)
    {
        return documentType switch
        {
            DocumentType.Receipt => "領収書",
            DocumentType.Quotation => "見積書",
            DocumentType.Invoice => "明細書_請求書",
            _ => "その他"
        };
    }
}

