using Club_Abacus_System.Data;
using Club_Abacus_System.DTOs;
using Club_Abacus_System.Models;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Services;

public class ExpenseService(AppDbContext context) : IExpenseService
{
    public async Task<ExpenseRequest> CreateExpenseRequestAsync(Guid userId, ExpenseRequestCreateDto dto)
    {
        // ユーザーが存在するか確認
        var userExists = await context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists)
        {
            throw new ArgumentException("指定されたユーザーは存在しません。");
        }

        // 合計金額の計算
        var totalAmount = dto.ExpenseItems.Sum(item => item.UnitPrice * item.Quantity);

        var expenseRequest = new ExpenseRequest
        {
            UserId = userId,
            Type = dto.Type,
            ReceiptType = dto.ReceiptType,
            Status = ExpenseStatus.Draft, // 初期ステータス（下書き）
            TotalAmount = totalAmount,
            ExpenseItems = dto.ExpenseItems.Select(itemDto => new ExpenseItem
            {
                ItemName = itemDto.ItemName,
                UnitPrice = itemDto.UnitPrice,
                Quantity = itemDto.Quantity,
                Payee = itemDto.Payee,
                Category = itemDto.Category,
                Description = itemDto.Description
            }).ToList()
        };

        context.ExpenseRequests.Add(expenseRequest);
        await context.SaveChangesAsync();

        return expenseRequest;
    }

    public async Task<ExpenseRequest?> GetExpenseRequestByIdAsync(Guid id)
    {
        return await context.ExpenseRequests
            .Include(e => e.ExpenseItems)
            .Include(e => e.ExpenseDocuments)
            .FirstOrDefaultAsync(e => e.Id == id);
    }

    public async Task<List<ExpenseRequest>> GetUserExpenseRequestsAsync(Guid userId)
    {
        return await context.ExpenseRequests
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> SubmitExpenseRequestAsync(Guid id, Guid userId)
    {
        var expenseRequest = await context.ExpenseRequests.FindAsync(id);

        if (expenseRequest == null)
        {
            throw new KeyNotFoundException("指定された申請が見つかりません。");
        }

        if (expenseRequest.UserId != userId)
        {
            throw new UnauthorizedAccessException("他人の申請を操作することはできません。");
        }

        // 下書き状態の場合のみ提出可能
        if (expenseRequest.Status != ExpenseStatus.Draft)
        {
            throw new InvalidOperationException("この申請はすでに提出されているか、処理が進んでいます。");
        }

        // ステータスを「承認待ち」に進める
        expenseRequest.Status = ExpenseStatus.PendingApproval;

        await context.SaveChangesAsync();
        return true;
    }
}
