using System.Security.Claims;
using Club_Abacus_System.Data;
using Club_Abacus_System.Models;
using Club_Abacus_System.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DevDataController(
    AppDbContext context,
    RoleManager<Role> roleManager,
    UserManager<User> userManager,
    IJwtTokenService jwtTokenService,
    IFileStorageService fileStorageService) : ControllerBase
{
    /// <summary>
    /// 開発用のテストユーザー一覧を取得します。
    /// </summary>
    [HttpGet("users")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDevUsers()
    {
        var users = await context.Users
            .Include(u => u.Role)
            .OrderBy(u => u.Role.Name)
            .ThenBy(u => u.Name)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                Role = u.Role.Name,
                u.StudentId
            })
            .ToListAsync();

        return Ok(users);
    }

    /// <summary>
    /// パスワード不要で指定ロールのテストユーザーとして即時トークンを発行します（開発専用）。
    /// </summary>
    [HttpPost("quick-login")]
    [AllowAnonymous]
    public async Task<IActionResult> QuickLogin([FromQuery] string role = "ADMIN", [FromQuery] string? email = null)
    {
        User? targetUser = null;
        if (!string.IsNullOrEmpty(email))
        {
            targetUser = await context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Email == email);
        }

        if (targetUser == null)
        {
            targetUser = await context.Users.Include(u => u.Role)
                .Where(u => u.Role.Name == role)
                .OrderBy(u => u.Name)
                .FirstOrDefaultAsync();
        }

        if (targetUser == null)
        {
            // ユーザーがいなければ自動で初期投入
            await SeedDevDataInternalAsync();
            targetUser = await context.Users.Include(u => u.Role)
                .Where(u => u.Role.Name == role)
                .OrderBy(u => u.Name)
                .FirstOrDefaultAsync();
        }

        if (targetUser == null)
        {
            return BadRequest($"ロール {role} のユーザーが見つかりません。");
        }

        var token = jwtTokenService.GenerateJwtToken(targetUser);

        return Ok(new
        {
            token,
            user = new
            {
                id = targetUser.Id,
                name = targetUser.Name,
                email = targetUser.Email,
                role = targetUser.Role?.Name ?? "USER"
            }
        });
    }

    /// <summary>
    /// 開発用の全テストデータ（ユーザー、年度、全ステータス申請、定期支払、証憑）を一括再構築します。
    /// </summary>
    [HttpPost("seed")]
    [AllowAnonymous]
    public async Task<IActionResult> SeedDevData()
    {
        var result = await SeedDevDataInternalAsync();
        return Ok(new
        {
            message = "開発用テストデータを正常に投入・初期化しました。",
            summary = result
        });
    }

    private async Task<object> SeedDevDataInternalAsync()
    {
        // 1. ロールの作成（存在しない場合）
        var roles = new[] { "ADMIN", "MANAGER", "USER" };
        var roleDict = new Dictionary<string, Role>();
        foreach (var r in roles)
        {
            var role = await roleManager.FindByNameAsync(r);
            if (role == null)
            {
                role = new Role { Name = r, Description = r == "ADMIN" ? "管理者" : (r == "MANAGER" ? "主将会計" : "一般部員") };
                await roleManager.CreateAsync(role);
            }
            roleDict[r] = role;
        }

        // 2. テストユーザーの作成
        var devUsers = new (string Email, string Name, string Role, string StudentId)[]
        {
            ("admin@example.com", "山田 太郎 (管理者)", "ADMIN", "AD001"),
            ("manager@example.com", "鈴木 一郎 (主将会計)", "MANAGER", "MG001"),
            ("tanaka@example.com", "田中 次郎 (部員)", "USER", "ST101"),
            ("sato@example.com", "佐藤 花子 (部員)", "USER", "ST102")
        };

        var userDict = new Dictionary<string, User>();
        foreach (var u in devUsers)
        {
            var user = await userManager.FindByEmailAsync(u.Email);
            if (user == null)
            {
                user = new User
                {
                    UserName = u.Email,
                    Email = u.Email,
                    Name = u.Name,
                    RoleId = roleDict[u.Role].Id,
                    StudentId = u.StudentId,
                    EnrollmentYear = 2024,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await userManager.CreateAsync(user);
                await userManager.AddToRoleAsync(user, u.Role);
            }
            userDict[u.Email] = user;
        }

        // 3. 年度の作成
        var existingFys = await context.FiscalYears.ToListAsync();
        FiscalYear fy2026;
        if (!existingFys.Any(f => f.YearName.Contains("2026")))
        {
            // 2025年度（締め済み）
            if (!existingFys.Any(f => f.YearName.Contains("2025")))
            {
                context.FiscalYears.Add(new FiscalYear
                {
                    YearName = "2025年度",
                    StartDate = new DateOnly(2025, 4, 1),
                    EndDate = new DateOnly(2026, 3, 31),
                    TotalBudget = 250000,
                    IsActive = false,
                    IsClosed = true,
                    CreatedAt = DateTime.UtcNow.AddMonths(-12)
                });
            }

            // 2026年度（進行中・メイン）
            fy2026 = new FiscalYear
            {
                YearName = "2026年度",
                StartDate = new DateOnly(2026, 4, 1),
                EndDate = new DateOnly(2027, 3, 31),
                TotalBudget = 350000,
                IsActive = true,
                IsClosed = false,
                CreatedAt = DateTime.UtcNow.AddMonths(-6)
            };
            context.FiscalYears.Add(fy2026);

            // 2027年度（未開始）
            if (!existingFys.Any(f => f.YearName.Contains("2027")))
            {
                context.FiscalYears.Add(new FiscalYear
                {
                    YearName = "2027年度",
                    StartDate = new DateOnly(2027, 4, 1),
                    EndDate = new DateOnly(2028, 3, 31),
                    TotalBudget = 400000,
                    IsActive = false,
                    IsClosed = false,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await context.SaveChangesAsync();
        }
        else
        {
            fy2026 = existingFys.First(f => f.YearName.Contains("2026"));
        }

        // 4. 定期支払いテンプレートの作成
        if (!await context.RecurringExpenseTemplates.AnyAsync())
        {
            var recurringTemplates = new List<RecurringExpenseTemplate>
            {
                new()
                {
                    UserId = userDict["tanaka@example.com"].Id,
                    TemplateName = "AWS クラウド利用料",
                    ItemName = "AWS インフラ・サーバー稼働費",
                    RecurringFrequency = RecurringFrequency.Monthly,
                    ExpenseType = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Amount = 4800,
                    IsAmountVariable = true,
                    Payee = "Amazon Web Services",
                    Category = "SERVER",
                    PurchaseUrl = "https://aws.amazon.com",
                    Description = "開発サーバーおよび本番ホスティングの利用料（為替でドル建て変動）",
                    NextGenerationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
                    TemplateStatus = TemplateStatus.Active,
                    CreatedAt = DateTime.UtcNow
                },
                new()
                {
                    UserId = userDict["manager@example.com"].Id,
                    TemplateName = "GitHub Team プラン",
                    ItemName = "GitHub Organization利用料",
                    RecurringFrequency = RecurringFrequency.Monthly,
                    ExpenseType = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Amount = 3000,
                    IsAmountVariable = false,
                    Payee = "GitHub, Inc.",
                    Category = "SERVER",
                    PurchaseUrl = "https://github.com",
                    Description = "チーム開発用アカウント管理",
                    NextGenerationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
                    TemplateStatus = TemplateStatus.Active,
                    CreatedAt = DateTime.UtcNow
                },
                new()
                {
                    UserId = userDict["tanaka@example.com"].Id,
                    TemplateName = "部活ドメイン更新費用",
                    ItemName = "club-abacus.org 年間ドメイン維持費",
                    RecurringFrequency = RecurringFrequency.Yearly,
                    ExpenseType = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Amount = 1800,
                    IsAmountVariable = false,
                    Payee = "お名前.com",
                    Category = "SERVER",
                    PurchaseUrl = "https://www.onamae.com",
                    Description = "年次更新のドメイン費用",
                    NextGenerationDate = new DateOnly(2027, 2, 1),
                    TemplateStatus = TemplateStatus.Active,
                    CreatedAt = DateTime.UtcNow
                },
                new()
                {
                    UserId = userDict["sato@example.com"].Id,
                    TemplateName = "【休止中】旧VPSサーバー費用",
                    ItemName = "さくらのVPS",
                    RecurringFrequency = RecurringFrequency.Monthly,
                    ExpenseType = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Amount = 990,
                    IsAmountVariable = false,
                    Payee = "さくらインターネット",
                    Category = "SERVER",
                    PurchaseUrl = "https://vps.sakura.ad.jp",
                    Description = "新サーバー移行に伴い一時停止中",
                    NextGenerationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)),
                    TemplateStatus = TemplateStatus.Inactive,
                    CreatedAt = DateTime.UtcNow
                }
            };
            context.RecurringExpenseTemplates.AddRange(recurringTemplates);
            await context.SaveChangesAsync();
        }

        // 5. サンプル領収書ファイルの準備
        var sampleBytes = System.Text.Encoding.UTF8.GetBytes("%PDF-1.4\n1 0 obj\n<< /Title (Sample Receipt) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
        string dummyFileId = "sample_dummy_receipt.pdf";
        try
        {
            using var ms = new System.IO.MemoryStream(sampleBytes);
            dummyFileId = await fileStorageService.SaveFileAsync(ms, "領収書_サンプル.pdf", "receipts");
        }
        catch {}

        // 6. 全ステータスの申請データを作成（未登録の場合）
        if (await context.ExpenseRequests.CountAsync() < 5)
        {
            var adminId = userDict["admin@example.com"].Id;
            var managerId = userDict["manager@example.com"].Id;
            var tanakaId = userDict["tanaka@example.com"].Id;
            var satoId = userDict["sato@example.com"].Id;

            var testRequests = new List<ExpenseRequest>
            {
                // ① Draft (下書き)
                new()
                {
                    UserId = tanakaId,
                    Title = "【下書き】技術書購入（実践Rustプログラミング）",
                    Type = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Status = ExpenseStatus.Draft,
                    TotalAmount = 3520,
                    CreatedAt = DateTime.UtcNow.AddHours(-3),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "実践Rustプログラミング書籍", UnitPrice = 3520, Quantity = 1, Payee = "Amazon.co.jp", Category = "BOOKS", PurchaseUrl = "https://amazon.co.jp" }
                    }
                },

                // ② PendingApproval (一般部員による承認待ち)
                new()
                {
                    UserId = tanakaId,
                    Title = "開発用4ポートUSBハブおよびCat6有線LANケーブル",
                    Type = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Status = ExpenseStatus.PendingApproval,
                    TotalAmount = 4980,
                    CreatedAt = DateTime.UtcNow.AddHours(-5),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "Anker USB 3.0 ハブ 4ポート", UnitPrice = 1980, Quantity = 1, Payee = "Amazon", Category = "EQUIPMENT", PurchaseUrl = "https://amazon.co.jp" },
                        new() { ItemName = "エレコム LANケーブル Cat6 10m", UnitPrice = 1500, Quantity = 2, Payee = "Amazon", Category = "EQUIPMENT", PurchaseUrl = "https://amazon.co.jp" }
                    }
                },

                // ③ PendingApproval (主将会計自身の申請・自己承認テスト用！)
                new()
                {
                    UserId = managerId,
                    Title = "【主将会計申請】秋季プログラミング大会 参加エントリー費",
                    Type = ExpenseType.Advance,
                    ReceiptType = ReceiptType.Paper,
                    Status = ExpenseStatus.PendingApproval,
                    TotalAmount = 20000,
                    CreatedAt = DateTime.UtcNow.AddHours(-6),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "大会参加費（4名分）", UnitPrice = 5000, Quantity = 4, Payee = "大会実行委員会", Category = "EVENT", Description = "主将会計自らが引率・出金するため申請" }
                    }
                },

                // ④ Approved (事前承認済・立替領収書待ち)
                new()
                {
                    UserId = tanakaId,
                    Title = "部室用 Wi-Fi 6 アクセスポイント増設",
                    Type = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Status = ExpenseStatus.Approved,
                    TotalAmount = 8900,
                    ApprovedById = managerId,
                    ApprovedAt = DateTime.UtcNow.AddDays(-1),
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "TP-Link Wi-Fi6 ルーター", UnitPrice = 8900, Quantity = 1, Payee = "ヨドバシ.com", Category = "EQUIPMENT", PurchaseUrl = "https://yodobashi.com" }
                    }
                },

                // ⑤ Approved (事前承認済・事前出金の現金渡し待ち)
                new()
                {
                    UserId = satoId,
                    Title = "学園祭展示ブース用資材・備品一式",
                    Type = ExpenseType.Advance,
                    ReceiptType = ReceiptType.Paper,
                    Status = ExpenseStatus.Approved,
                    TotalAmount = 15000,
                    ApprovedById = managerId,
                    ApprovedAt = DateTime.UtcNow.AddDays(-1),
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "展示パネル・装飾資材", UnitPrice = 15000, Quantity = 1, Payee = "東急ハンズ", Category = "EVENT" }
                    }
                },

                // ⑥ Advance_MoneyHandedOver (現金渡し済・領収書とお釣り待ち)
                new()
                {
                    UserId = satoId,
                    Title = "ロボットコンテスト遠征交通費（新幹線自由席）",
                    Type = ExpenseType.Advance,
                    ReceiptType = ReceiptType.Paper,
                    Status = ExpenseStatus.Advance_MoneyHandedOver,
                    TotalAmount = 18500,
                    ApprovedById = managerId,
                    ApprovedAt = DateTime.UtcNow.AddDays(-5),
                    CreatedAt = DateTime.UtcNow.AddDays(-7),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "新幹線往復チケット", UnitPrice = 18500, Quantity = 1, Payee = "JR東日本", Category = "EVENT" }
                    }
                },

                // ⑦ Advance_MoneyHandedOver (30日以上未精算・アラート表示テスト用！)
                new()
                {
                    UserId = satoId,
                    Title = "【未精算警告テスト】夏期合宿 セミナー室レンタル費",
                    Type = ExpenseType.Advance,
                    ReceiptType = ReceiptType.Paper,
                    Status = ExpenseStatus.Advance_MoneyHandedOver,
                    TotalAmount = 12000,
                    ApprovedById = managerId,
                    ApprovedAt = DateTime.UtcNow.AddDays(-35),
                    CreatedAt = DateTime.UtcNow.AddDays(-38),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "研修室レンタル費（前納金）", UnitPrice = 12000, Quantity = 1, Payee = "合宿所事務局", Category = "EVENT" }
                    }
                },

                // ⑧ WaitingConfirmation (証憑アップロード済・金額照合テスト用)
                new()
                {
                    UserId = tanakaId,
                    Title = "UIデザイン制作ツール（Figma有料プラン年間一括）",
                    Type = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Status = ExpenseStatus.WaitingConfirmation,
                    TotalAmount = 14400,
                    ApprovedById = managerId,
                    ApprovedAt = DateTime.UtcNow.AddDays(-4),
                    CreatedAt = DateTime.UtcNow.AddDays(-5),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "Figma Professional 年間ライセンス", UnitPrice = 14400, Quantity = 1, Payee = "Figma Inc.", Category = "SERVER", PurchaseUrl = "https://figma.com" }
                    },
                    ExpenseDocuments = new List<ExpenseDocument>
                    {
                        new()
                        {
                            DocumentType = DocumentType.Receipt,
                            OriginalFileName = "figma_receipt_2026.pdf",
                            StorageKey = dummyFileId,
                            ContentType = "application/pdf",
                            UploadedAt = DateTime.UtcNow.AddDays(-1)
                        }
                    }
                },

                // ⑨ WaitingConfirmation (為替変動・照合画面で実額確定テスト用！)
                new()
                {
                    UserId = tanakaId,
                    Title = "9月度 AWS ホスティング請求（為替変動あり・未確定）",
                    Type = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Status = ExpenseStatus.WaitingConfirmation,
                    TotalAmount = 5000,
                    IsAmountVariable = true,
                    IsAmountFinalized = false,
                    ApprovedById = managerId,
                    ApprovedAt = DateTime.UtcNow.AddDays(-3),
                    CreatedAt = DateTime.UtcNow.AddDays(-4),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "AWS 9月度利用料（カード請求明細照合待ち）", UnitPrice = 5000, Quantity = 1, Payee = "AWS", Category = "SERVER", PurchaseUrl = "https://aws.amazon.com" }
                    },
                    ExpenseDocuments = new List<ExpenseDocument>
                    {
                        new()
                        {
                            DocumentType = DocumentType.Invoice,
                            OriginalFileName = "aws_invoice_september.pdf",
                            StorageKey = dummyFileId,
                            ContentType = "application/pdf",
                            UploadedAt = DateTime.UtcNow.AddDays(-1)
                        }
                    }
                },

                // ⑨-2 WaitingUniversitySubmission (証憑確認完了・大学UNIPA提出待ち)
                new()
                {
                    UserId = tanakaId,
                    Title = "【大学提出待ち】オープンキャンパス展示用 Raspberry Pi 5 キット一式",
                    Type = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Status = ExpenseStatus.WaitingUniversitySubmission,
                    TotalAmount = 16800,
                    ApprovedById = managerId,
                    ApprovedAt = DateTime.UtcNow.AddDays(-2),
                    CreatedAt = DateTime.UtcNow.AddDays(-5),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "Raspberry Pi 5 8GB 本体およびスターターキット", UnitPrice = 16800, Quantity = 1, Payee = "スイッチサイエンス", Category = "EQUIPMENT", PurchaseUrl = "https://www.switch-science.com" }
                    },
                    ExpenseDocuments = new List<ExpenseDocument>
                    {
                        new()
                        {
                            DocumentType = DocumentType.Receipt,
                            OriginalFileName = "switchscience_receipt.pdf",
                            StorageKey = dummyFileId,
                            ContentType = "application/pdf",
                            UploadedAt = DateTime.UtcNow.AddDays(-2)
                        }
                    }
                },

                // ⑩ UniversitySubmitted (大学UNIPAへ提出済・精算完了待ち)
                new()
                {
                    UserId = satoId,
                    Title = "部室用 27インチ4K作業用ディスプレイ",
                    Type = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Status = ExpenseStatus.UniversitySubmitted,
                    TotalAmount = 29800,
                    ApprovedById = managerId,
                    ApprovedAt = DateTime.UtcNow.AddDays(-8),
                    CreatedAt = DateTime.UtcNow.AddDays(-10),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "Dell 27インチ4Kモニター", UnitPrice = 29800, Quantity = 1, Payee = "Dell Japan", Category = "EQUIPMENT", PurchaseUrl = "https://dell.com" }
                    }
                },

                // ⑪ Settled (精算完了済み実績 1)
                new()
                {
                    UserId = tanakaId,
                    Title = "アルゴリズム解説本・競技プログラミング参考書",
                    Type = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Paper,
                    Status = ExpenseStatus.Settled,
                    TotalAmount = 4500,
                    ApprovedById = managerId,
                    ApprovedAt = DateTime.UtcNow.AddDays(-15),
                    CreatedAt = DateTime.UtcNow.AddDays(-20),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "アルゴリズム図鑑 2冊セット", UnitPrice = 2250, Quantity = 2, Payee = "ジュンク堂書店", Category = "BOOKS" }
                    }
                },

                // ⑫ Settled (精算完了済み実績 2)
                new()
                {
                    UserId = satoId,
                    Title = "新入生歓迎会用チラシ・ポスター印刷",
                    Type = ExpenseType.Advance,
                    ReceiptType = ReceiptType.Paper,
                    Status = ExpenseStatus.Settled,
                    TotalAmount = 8800,
                    ApprovedById = managerId,
                    ApprovedAt = DateTime.UtcNow.AddDays(-25),
                    CreatedAt = DateTime.UtcNow.AddDays(-30),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "A4カラーチラシ 500枚印刷", UnitPrice = 8800, Quantity = 1, Payee = "プリントパック", Category = "EVENT" }
                    }
                },

                // ⑬ Remanded (差し戻し中・理由付き)
                new()
                {
                    UserId = tanakaId,
                    Title = "個人用途兼用のゲーミングマウス",
                    Type = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Status = ExpenseStatus.Remanded,
                    TotalAmount = 7900,
                    RejectionReason = "個人の私物利用が主と思われるため、部活動での共有備品としての利用理由を備考に追記してください。",
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "Logicool G PRO マウス", UnitPrice = 7900, Quantity = 1, Payee = "Amazon", Category = "EQUIPMENT", PurchaseUrl = "https://amazon.co.jp" }
                    }
                },

                // ⑭ Rejected (却下・理由付き)
                new()
                {
                    UserId = tanakaId,
                    Title = "部室用 Nintendo Switch ゲームソフト",
                    Type = ExpenseType.Reimbursement,
                    ReceiptType = ReceiptType.Digital,
                    Status = ExpenseStatus.Rejected,
                    TotalAmount = 6500,
                    RejectionReason = "部活動規程の経費対象外です。娯楽用ソフトウェアの部費購入は認められません。",
                    CreatedAt = DateTime.UtcNow.AddDays(-12),
                    ExpenseItems = new List<ExpenseItem>
                    {
                        new() { ItemName = "ゲームソフト 1本", UnitPrice = 6500, Quantity = 1, Payee = "任天堂オンライン", Category = "OTHER", PurchaseUrl = "https://nintendo.com" }
                    }
                }
            };

            context.ExpenseRequests.AddRange(testRequests);
            await context.SaveChangesAsync();
        }

        return new
        {
            usersCount = await context.Users.CountAsync(),
            fiscalYearsCount = await context.FiscalYears.CountAsync(),
            recurringTemplatesCount = await context.RecurringExpenseTemplates.CountAsync(),
            requestsCount = await context.ExpenseRequests.CountAsync()
        };
    }
}
