import DashboardLayout from "@/components/DashboardLayout";
import { Banknote, CheckCircle, AlertCircle, Clock, Upload, CreditCard, Download, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import umatLogo from "@/assets/umat-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

interface FeeRecord {
  id: string;
  academic_year: string;
  semester: string;
  total_amount: number;
  amount_paid: number;
  outstanding: number;
  status: string;
  is_cleared: boolean;
}

const fees: FeeRecord[] = [];

const formatCurrency = (amount: number) => `GHS ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const formatCurrencyDisplay = (amount: number) => `GH\u20B5 ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

const statusConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  Paid: { icon: <CheckCircle size={14} />, className: "bg-success/10 text-success" },
  Partial: { icon: <AlertCircle size={14} />, className: "bg-warning/10 text-warning" },
  Unpaid: { icon: <Clock size={14} />, className: "bg-muted text-muted-foreground" },
};

const FinancialStatus = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "receipt" | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    apiFetch<FeeRecord[]>(`/fees/student/${user.id}`)
      .then(setFees)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const totalAmount = fees.reduce((sum, f) => sum + f.total_amount, 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.amount_paid, 0);
  const totalOwed = fees.reduce((sum, f) => sum + f.outstanding, 0);


  const handleDownloadReceipt = async (fee: FeeRecord) => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      // --- Border ---
      doc.setDrawColor(34, 87, 50);
      doc.setLineWidth(0.7);
      doc.rect(12, 10, pageW - 24, 272);

      // --- Logo ---
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = umatLogo;
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
        doc.addImage(img, "PNG", pageW / 2 - 12, 14, 24, 24);
      } catch { /* continue without logo */ }

      // --- Header ---
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("UNIVERSITY OF MINES AND TECHNOLOGY", pageW / 2, 44, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Tarkwa, Ghana", pageW / 2, 50, { align: "center" });
      doc.setFontSize(9);
      doc.text("School of Postgraduate Studies", pageW / 2, 56, { align: "center" });

      // --- Title banner ---
      doc.setFillColor(34, 87, 50);
      doc.rect(20, 62, pageW - 40, 10, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("FEE PAYMENT RECEIPT", pageW / 2, 69, { align: "center" });
      doc.setTextColor(0, 0, 0);

      // --- Receipt No & Date ---
      const receiptNo = `RCP-${Date.now().toString(36).toUpperCase()}`;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Receipt No: ${receiptNo}`, 25, 82);
      doc.text(`Date: ${new Date().toLocaleDateString("en-GB")}`, pageW - 25, 82, { align: "right" });

      // --- Divider ---
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(20, 86, pageW - 20, 86);

      // --- Student Info Section ---
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("STUDENT INFORMATION", 25, 94);

      const studentFields = [
        ["Name", user?.name || "N/A"],
        ["Index Number", user?.indexNumber || "N/A"],
        ["Programme", user?.program || "N/A"],
        ["Department", user?.department || "N/A"],
      ];

      let y = 102;
      studentFields.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`${label}:`, 25, y);
        doc.setFont("helvetica", "normal");
        doc.text(value, 75, y);
        y += 7;
      });

      // --- Divider ---
      doc.line(20, y + 2, pageW - 20, y + 2);
      y += 10;

      // --- Payment Details Section ---
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT DETAILS", 25, y);
      y += 10;

      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(25, y - 5, pageW - 50, 8, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Description", 28, y);
      doc.text("Amount", pageW - 28, y, { align: "right" });
      y += 10;

      // Table rows
      const paymentRows = [
        ["Academic Year", fee.academic_year],
        ["Semester", fee.semester],
        ["Total Fee", formatCurrency(fee.total_amount)],
        ["Amount Paid", formatCurrency(fee.amount_paid)],
        ["Outstanding Balance", formatCurrency(fee.outstanding)],
      ];

      doc.setFont("helvetica", "normal");
      paymentRows.forEach(([label, value]) => {
        doc.text(label, 28, y);
        doc.text(value, pageW - 28, y, { align: "right" });
        doc.setDrawColor(230, 230, 230);
        doc.line(25, y + 3, pageW - 25, y + 3);
        y += 9;
      });

      // Status row highlighted
      y += 2;
      const statusColor = fee.status === "Paid" ? [34, 139, 34] : fee.status === "Partial" ? [200, 150, 0] : [200, 50, 50];
      doc.setFont("helvetica", "bold");
      doc.text("Payment Status:", 28, y);
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(fee.status.toUpperCase(), pageW - 28, y, { align: "right" });
      doc.setTextColor(0, 0, 0);

      // --- Footer ---
      doc.setDrawColor(34, 87, 50);
      doc.setLineWidth(0.5);
      doc.line(20, 255, pageW - 20, 255);

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("This is a computer-generated receipt and does not require a signature.", pageW / 2, 262, { align: "center" });
      doc.text("For enquiries, contact the Finance Office - School of Postgraduate Studies, UMaT", pageW / 2, 268, { align: "center" });
      doc.text(`Generated on ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB")}`, pageW / 2, 274, { align: "center" });
      doc.setTextColor(0, 0, 0);

      doc.save(`UMaT_Fee_Receipt_${fee.academic_year.replace(/\//, "-")}_${fee.semester}.pdf`);
      toast({ title: "Receipt downloaded", description: `Payment receipt for ${fee.academic_year} ${fee.semester}` });
    } catch {
      toast({ title: "Download failed", description: "Could not generate receipt", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Financial Status</h1>
        <p className="text-muted-foreground mt-1">View your fees and payment history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center mb-3">
            <Banknote size={18} className="text-secondary-foreground" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{loading ? "—" : formatCurrencyDisplay(totalAmount)}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Fees</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mb-3">
            <CheckCircle size={18} className="text-success" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{loading ? "—" : formatCurrencyDisplay(totalPaid)}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Paid</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-3">
            <AlertCircle size={18} className="text-destructive" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{loading ? "—" : formatCurrencyDisplay(totalOwed)}</p>
          <p className="text-sm text-muted-foreground mt-1">Outstanding Balance</p>
        </div>
      </div>

      {totalOwed > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-8">
          <h2 className="font-display text-lg font-bold text-foreground mb-3">Make a Payment</h2>
          <p className="text-sm text-muted-foreground mb-4">Choose your preferred payment method to settle your outstanding balance.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => { setShowPayModal(true); setPaymentMethod("online"); }}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-secondary/50 hover:bg-secondary/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center shrink-0">
                <CreditCard size={18} className="text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Pay Online</p>
                <p className="text-xs text-muted-foreground">Mobile Money or Bank Card</p>
              </div>
            </button>
            <button
              onClick={() => { setShowPayModal(true); setPaymentMethod("receipt"); }}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-secondary/50 hover:bg-secondary/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <Upload size={18} className="text-info" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Upload Receipt</p>
                <p className="text-xs text-muted-foreground">Bank deposit or transfer proof</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowPayModal(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            {paymentMethod === "online" ? (
              <>
                <h3 className="font-display text-lg font-bold text-foreground mb-1">Pay Online</h3>
                <p className="text-sm text-muted-foreground mb-5">Enter the amount you want to pay towards your outstanding balance of GH₵ {totalOwed.toLocaleString()}</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Amount (GH₵)</label>
                    <input type="number" defaultValue={totalOwed}
                      className="w-full mt-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Payment Channel</label>
                    <select className="w-full mt-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none">
                      <option>MTN Mobile Money</option>
                      <option>Vodafone Cash</option>
                      <option>AirtelTigo Money</option>
                      <option>Visa / Mastercard</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Phone Number / Card</label>
                    <input type="text" placeholder="024 XXX XXXX"
                      className="w-full mt-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none" />
                  </div>
                  <button className="w-full py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
                    Proceed to Pay
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-foreground mb-1">Upload Payment Receipt</h3>
                <p className="text-sm text-muted-foreground mb-5">Upload a photo or scan of your bank payment receipt for verification.</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Amount Paid (GH₵)</label>
                    <input type="number"
                      className="w-full mt-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Transaction Reference</label>
                    <input type="text" placeholder="e.g. TXN-123456"
                      className="w-full mt-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none" />
                  </div>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-secondary/50 transition-colors">
                    <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload receipt</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">PDF, JPG, PNG (max 5MB)</p>
                  </div>
                  <button className="w-full py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
                    Submit for Verification
                  </button>
                </div>
              </>
            )}
            <button onClick={() => setShowPayModal(false)} className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden hidden md:block">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading fee records...
          </div>
        ) : fees.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No fee records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Academic Year</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Semester</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((f) => {
                  const cfg = statusConfig[f.status] || statusConfig.Unpaid;
                  return (
                    <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{f.academic_year}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{f.semester}</td>
                      <td className="px-6 py-4 text-sm text-right text-muted-foreground">{formatCurrencyDisplay(f.total_amount)}</td>
                      <td className="px-6 py-4 text-sm text-right text-muted-foreground">{formatCurrencyDisplay(f.amount_paid)}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-foreground">{formatCurrencyDisplay(f.outstanding)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.className}`}>
                          {cfg.icon}
                          {f.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleDownloadReceipt(f)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Download receipt" aria-label="Download receipt">
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading...
          </div>
        ) : fees.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No fee records found</div>
        ) : (
          fees.map((f) => {
            const cfg = statusConfig[f.status] || statusConfig.Unpaid;
            return (
              <div key={f.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{f.academic_year} — {f.semester}</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.className}`}>
                    {cfg.icon}
                    {f.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><p className="text-muted-foreground">Amount</p><p className="font-medium text-foreground">{formatCurrencyDisplay(f.total_amount)}</p></div>
                  <div><p className="text-muted-foreground">Paid</p><p className="font-medium text-foreground">{formatCurrencyDisplay(f.amount_paid)}</p></div>
                  <div><p className="text-muted-foreground">Balance</p><p className="font-medium text-foreground">{formatCurrencyDisplay(f.outstanding)}</p></div>
                </div>
                <button onClick={() => handleDownloadReceipt(f)} className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
                  <Download size={14} /> Download Receipt
                </button>
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
};

export default FinancialStatus;
