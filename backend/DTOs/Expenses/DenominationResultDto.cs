namespace Club_Abacus_System.DTOs.Expenses;

public class DenominationResultDto
{
    public int TenThousand { get; set; }
    public int FiveThousand { get; set; }
    public int OneThousand { get; set; }
    public int FiveHundred { get; set; }
    public int OneHundred { get; set; }
    public int Fifty { get; set; }
    public int Ten { get; set; }
    public int Five { get; set; }
    public int One { get; set; }
    public int TotalAmount { get; set; }

    public void Add(DenominationResultDto other)
    {
        this.TenThousand += other.TenThousand;
        this.FiveThousand += other.FiveThousand;
        this.OneThousand += other.OneThousand;
        this.FiveHundred += other.FiveHundred;
        this.OneHundred += other.OneHundred;
        this.Fifty += other.Fifty;
        this.Ten += other.Ten;
        this.Five += other.Five;
        this.One += other.One;
        this.TotalAmount += other.TotalAmount;
    }
}
