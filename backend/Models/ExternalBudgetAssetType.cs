namespace Club_Abacus_System.Models;

/// <summary>
/// 部費外予算の保有・支払形態（資産種別）
/// </summary>
public enum ExternalBudgetAssetType
{
    Cash = 1,          // 現金
    AmazonGift = 2,    // Amazonギフトカード
    Other = 3          // その他（図書カード、クオカードなど）
}
