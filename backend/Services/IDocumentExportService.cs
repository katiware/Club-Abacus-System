using System.IO;
using System.Threading.Tasks;
using System;

namespace Club_Abacus_System.Services;

public interface IDocumentExportService
{
    Task<Stream> ExportDocumentsToZipAsync(Guid requestId, Guid currentUserId, bool hasAdminAccess);
}
