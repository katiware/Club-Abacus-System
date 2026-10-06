using System.IO.Compression;
using Club_Abacus_System.Models;

namespace Club_Abacus_System.Services;

public class DocumentExportService(IExpenseDocumentService expenseDocumentService) : IDocumentExportService
{
    public async Task<Stream> ExportDocumentsToZipAsync(Guid requestId, Guid currentUserId, bool hasAdminAccess)
    {
        // 1. 対象の申請に紐づく証憑情報を全て取得
        var documents = await expenseDocumentService.GetDocumentsAsync(requestId, currentUserId, hasAdminAccess);
        
        if (!documents.Any())
        {
            throw new KeyNotFoundException("対象の証憑ファイルが見つかりません。");
        }

        // 2. 将来的なGoogle Drive連携（あるいは別用途）も考慮し、
        // いったんメモリストリームとしてZIPデータを構築する
        var memoryStream = new MemoryStream();

        // leaveOpen: true を指定することで、ZipArchiveをDisposeしてもmemoryStreamは開いたままにする
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var doc in documents)
            {
                // 各ファイルのストリームを取得
                var (fileStream, _, fileName) = await expenseDocumentService.GetDocumentFileAsync(requestId, doc.Id, currentUserId, hasAdminAccess);

                using (fileStream)
                {
                    // 項目（DocumentType）ごとのフォルダ名を取得
                    var folderName = GetFolderNameByDocumentType(doc.DocumentType);
                    var entryName = $"{folderName}/{fileName}";
                    
                    // ZIP内にエントリ（ファイル）を作成し、データを書き込む
                    var entry = archive.CreateEntry(entryName);
                    using var entryStream = entry.Open();
                    await fileStream.CopyToAsync(entryStream);
                }
            }
        } // ここでZipArchiveがDisposeされ、ZIPの終端データがmemoryStreamに書き込まれる

        // 3. 呼び出し元がこのストリームを先頭から読み取れるように位置を0に戻す
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
