import jsPDF from 'jspdf';
import { Download } from 'lucide-react';
import { formatDual } from '../lib/utils';

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
  doc.text(
    new Date(data.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
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

  // Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text('BILL TO', margin, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(data.clientName, margin, y);
  if (data.clientEmail) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(data.clientEmail, margin, y);
  }

  // Bill From
  y = 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text('BILL FROM', margin + halfW, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(data.freelancerName, margin + halfW, y);
  if (data.freelancerEmail) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(data.freelancerEmail, margin + halfW, y);
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
  doc.text(data.jobTitle.substring(0, 55), margin + 4, y + 7);

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
  data.milestones.forEach((m, i) => {
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

    // Milestone title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const title = m.title.length > 42 ? m.title.substring(0, 39) + '...' : m.title;
    doc.text(title, margin + 14, y + 4);

    // Status badge
    const statusLabel = m.status === 'approved' ? 'Completed' : m.status.replace('_', ' ');
    const sc: [number, number, number] = m.status === 'approved' ? [16, 185, 129] : [245, 158, 11];
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
    const shortAmt = data.currency === 'inr'
      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(m.amount)
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(m.amount);
    doc.text(shortAmt, w - margin - 4, y + 4, { align: 'right' });

    // Subtle bottom line
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.15);
    doc.line(margin + 4, y + rowH - 3, w - margin - 4, y + rowH - 3);

    y += rowH;
  });

  // ── Total ──────────────────────────────────────
  y += 6;
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL', margin + 4, y);

  // Total — show primary currency, then secondary below
  const primaryAmt = data.currency === 'inr'
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data.totalAmount)
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.totalAmount);
  const secondaryAmt = data.currency === 'inr'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.round(data.totalAmount / 83.33))
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(data.totalAmount * 83.33));
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129);
  doc.text(primaryAmt, w - margin - 4, y, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`(${secondaryAmt})`, w - margin - 4, y + 6, { align: 'right' });

  // ── Payment Note ───────────────────────────────
  y += 12;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, y - 4, contentWidth, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text(
    'Payment processed via GENOSHA escrow system. This invoice serves as proof of settled escrow for the listed milestones.',
    margin + 4, y + 3
  );

  // ── Footer ─────────────────────────────────────
  const footerY = 277;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, w - margin, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text('GENOSHA', margin, footerY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('The Freelance Marketplace', margin + 25, footerY + 6);
  doc.text('genosha.io', w - margin, footerY + 6, { align: 'right' });

  // Bottom green bar
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 293, w, 3, 'F');

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
