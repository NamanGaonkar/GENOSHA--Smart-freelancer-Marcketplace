import jsPDF from 'jspdf';
import { Download } from 'lucide-react';

interface MilestoneItem {
  title: string;
  amount: number;
  status: string;
}

interface InvoiceData {
  contractId: string;
  jobTitle: string;
  clientName: string;
  clientEmail?: string;
  freelancerName: string;
  freelancerEmail?: string;
  milestones: MilestoneItem[];
  totalAmount: number;
  currency?: string;
  completedAt: string;
}

function formatCurrency(amount: number, currency?: string): string {
  if (currency === 'inr') {
    return 'INR ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
  }
  return 'USD ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);
}

function secondaryCurrency(amount: number, currency?: string): string {
  if (currency === 'inr') {
    const usd = Math.round(amount / 83.33);
    return '(~USD ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(usd) + ')';
  }
  const inr = Math.round(amount * 83.33);
  return '(~INR ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(inr) + ')';
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = w - margin * 2;

  let y = 0;

  // ── Top Green Accent Bar ──────────────────────
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, w, 3, 'F');

  // ── Header ─────────────────────────────────────
  y = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.text('GENOSHA', margin, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('FREELANCE MARKETPLACE INVOICE', margin, y + 7);

  // Invoice number & date — right side
  y = 22;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Invoice #INV-${data.contractId.substring(0, 8).toUpperCase()}`, w - margin, y, { align: 'right' });
  const invD = new Date(data.completedAt);
  const invDD = String(invD.getDate()).padStart(2, '0');
  const invMM = String(invD.getMonth() + 1).padStart(2, '0');
  const invYYYY = invD.getFullYear();
  doc.text(
    `${invDD}/${invMM}/${invYYYY}`,
    w - margin, y + 6, { align: 'right' }
  );

  // PAID badge
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(w - margin - 28, y + 10, 28, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('PAID', w - margin - 14, y + 15, { align: 'center' });

  // ── Divider ────────────────────────────────────
  y = 40;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, w - margin, y);

  // ── Bill To / Bill From ────────────────────────
  y = 50;
  const halfW = contentWidth / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text('BILL TO', margin, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(data.clientName.substring(0, 35), margin, y);
  if (data.clientEmail) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(data.clientEmail.substring(0, 40), margin, y);
  }

  y = 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text('BILL FROM', margin + halfW, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(data.freelancerName.substring(0, 35), margin + halfW, y);
  if (data.freelancerEmail) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(data.freelancerEmail.substring(0, 40), margin + halfW, y);
  }

  // ── Project Info Bar ───────────────────────────
  y = 74;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y - 4, contentWidth, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PROJECT', margin + 4, y + 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  // Wrap long titles across multiple lines
  const titleLines = doc.splitTextToSize(data.jobTitle, contentWidth - 8);
  doc.text(titleLines[0].substring(0, 60), margin + 4, y + 7);

  // ── Milestones Table ───────────────────────────
  y = 96;

  // Table Header
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin, y - 3, contentWidth, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('#', margin + 4, y + 2.5);
  doc.text('MILESTONE', margin + 14, y + 2.5);
  doc.text('STATUS', w - margin - 55, y + 2.5);
  doc.text('AMOUNT', w - margin - 4, y + 2.5, { align: 'right' });

  // Table Rows
  y += 12;

  // If we have milestones, render them; otherwise render a single row for the whole contract
  const rows = data.milestones.length > 0
    ? data.milestones
    : [{ title: data.jobTitle, amount: data.totalAmount, status: 'completed' }];

  rows.forEach((m, i) => {
    const rowH = 10;

    // Alternating row bg
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 2, contentWidth, rowH, 'F');
    }

    // Row number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${i + 1}`, margin + 4, y + 4);

    // Milestone title (wrap if needed)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const title = m.title.length > 40 ? m.title.substring(0, 37) + '...' : m.title;
    doc.text(title, margin + 14, y + 4);

    // Status badge
    const statusLabel = m.status === 'approved' || m.status === 'completed' ? 'Completed' : m.status === 'approved_released' ? 'Paid' : m.status.replace(/_/g, ' ');
    const sc: [number, number, number] = (m.status === 'approved' || m.status === 'completed' || m.status === 'approved_released') ? [16, 185, 129] : [245, 158, 11];
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    const sW = doc.getStringUnitWidth(statusLabel) * 7 / doc.internal.scaleFactor + 6;
    doc.setFillColor(sc[0], sc[1], sc[2]);
    doc.roundedRect(w - margin - 55, y + 0.5, sW, 5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(statusLabel, w - margin - 55 + sW / 2, y + 4, { align: 'center' });

    // Amount — use short format to fit column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(m.amount, data.currency), w - margin - 4, y + 4, { align: 'right' });

    // Subtle bottom line
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.15);
    doc.line(margin + 4, y + rowH - 3, w - margin - 4, y + rowH - 3);

    y += rowH;
  });

  // ── Subtotal / Platform Fee / Total ────────────
  y += 8;
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal', margin + 4, y);
  doc.text(formatCurrency(data.totalAmount, data.currency), w - margin - 4, y, { align: 'right' });

  y += 6;
  doc.text('Platform Fee (0%)', margin + 4, y);
  doc.text(formatCurrency(0, data.currency), w - margin - 4, y, { align: 'right' });

  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, w - margin, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL', margin + 4, y);
  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(data.totalAmount, data.currency), w - margin - 4, y, { align: 'right' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(secondaryCurrency(data.totalAmount, data.currency), w - margin - 4, y, { align: 'right' });

  // ── Payment Note ───────────────────────────────
  y += 12;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, y - 4, contentWidth, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text(
    'Payment processed via GENOSHA escrow system. This invoice serves as proof of settled escrow.',
    margin + 4, y + 3
  );

  // ── Footer (pinned to absolute bottom of A4 page) ──────
  const pageH = doc.internal.pageSize.getHeight(); // 297mm ≈ 841.89pt for A4
  const footerY = pageH - margin; // bottom edge

  // Footer divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 14, w - margin, footerY - 14);

  // Footer text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text('GENOSHA', margin, footerY - 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('The Freelance Marketplace', margin + 25, footerY - 7);
  doc.text('genosha.io', w - margin, footerY - 7, { align: 'right' });

  // Bottom green accent bar
  doc.setFillColor(16, 185, 129);
  doc.rect(0, footerY - 2, w, 2, 'F');

  return doc;
}

interface InvoiceButtonProps {
  data: InvoiceData;
}

export default function InvoiceButton({ data }: InvoiceButtonProps) {
  const handleDownload = () => {
    const doc = generateInvoicePDF(data);
    doc.save(`GENOSHA-Invoice-${data.contractId.substring(0, 8)}.pdf`);
  };

  return (
    <button onClick={handleDownload}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
        border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.06)',
        color: '#10b981', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.06)'; }}>
      <Download size={13} /> Download Invoice
    </button>
  );
}
