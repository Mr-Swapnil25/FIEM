/**
 * Export Reports Service
 * Uses dynamic imports for jspdf and xlsx to reduce bundle size
 */
import type jsPDF from 'jspdf';
import { Booking, Event } from '../types';

export type ExportFormat = 'csv' | 'pdf' | 'excel';

interface ExportOptions {
  participants: Booking[];
  event: Event;
  stats: {
    total: number;
    confirmed: number;
    checkedIn: number;
  };
}

/**
 * Export participant data to CSV format
 */
export function exportToCSV({ participants, event }: ExportOptions): void {
  const headers = ['Name', 'Email', 'Ticket ID', 'Status', 'Amount Paid', 'Booked At', 'Checked In At'];
  
  const rows = participants.map(p => [
    p.userName || 'N/A',
    p.userEmail || 'N/A',
    p.ticketId,
    p.status,
    p.amountPaid === 0 ? 'Free' : `$${p.amountPaid}`,
    formatDate(p.bookedAt),
    p.checkedInAt ? formatDate(p.checkedInAt) : '-'
  ]);

  const csvContent = [
    // Event info header
    [`Event: ${event.title}`],
    [`Date: ${formatDate(event.eventDate)}`],
    [`Venue: ${event.venue}`],
    [],
    headers,
    ...rows
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  downloadFile(csvContent, `${sanitizeFilename(event.title)}_participants.csv`, 'text/csv');
}

/**
 * Export participant data to PDF format with professional styling
 * Uses dynamic import for jspdf to reduce bundle size
 */
export async function exportToPDF({ participants, event, stats }: ExportOptions): Promise<void> {
  // Dynamic import - only loads when PDF export is used
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(79, 70, 229); // Indigo
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Participant Report', 14, 20);
  
  // Event name
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(event.title, 14, 30);
  
  // Date and venue
  doc.setFontSize(9);
  doc.text(`${formatDate(event.eventDate)} • ${event.venue}`, 14, 38);
  
  // Stats boxes
  const boxY = 55;
  const boxHeight = 25;
  const boxWidth = (pageWidth - 40) / 3;
  
  // Total Participants
  drawStatBox(doc, 14, boxY, boxWidth, boxHeight, 'Total Participants', stats.total.toString(), '#4F46E5');
  
  // Confirmed
  drawStatBox(doc, 14 + boxWidth + 6, boxY, boxWidth, boxHeight, 'Confirmed', stats.confirmed.toString(), '#10B981');
  
  // Checked In
  drawStatBox(doc, 14 + (boxWidth + 6) * 2, boxY, boxWidth, boxHeight, 'Checked In', stats.checkedIn.toString(), '#3B82F6');
  
  // Table
  const tableData = participants.map(p => [
    p.userName || 'N/A',
    p.userEmail || 'N/A',
    p.ticketId,
    p.status.toUpperCase(),
    p.amountPaid === 0 ? 'Free' : `$${p.amountPaid}`,
    formatDate(p.bookedAt)
  ]);

  autoTable(doc, {
    startY: boxY + boxHeight + 15,
    head: [['Name', 'Email', 'Ticket ID', 'Status', 'Amount', 'Booked']],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 50 },
      2: { cellWidth: 25 },
      3: { cellWidth: 22 },
      4: { cellWidth: 20 },
      5: { cellWidth: 28 },
    },
  });
  
  // Footer
  const pageCount = doc.internal.pages.length - 1;
  doc.setFontSize(8);
  doc.setTextColor(128);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  doc.save(`${sanitizeFilename(event.title)}_participants.pdf`);
}

/**
 * Export participant data to Excel format
 * Uses dynamic import for xlsx to reduce bundle size
 */
export async function exportToExcel({ participants, event, stats }: ExportOptions): Promise<void> {
  // Dynamic import - only loads when Excel export is used
  const XLSX = await import('xlsx');
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Summary sheet data
  const summaryData = [
    ['Event Report'],
    [],
    ['Event Name', event.title],
    ['Date', formatDate(event.eventDate)],
    ['Venue', event.venue],
    ['Category', event.category],
    [],
    ['Statistics'],
    ['Total Participants', stats.total],
    ['Confirmed', stats.confirmed],
    ['Checked In', stats.checkedIn],
    ['Available Slots', event.availableSlots],
    [],
    [`Generated on ${new Date().toLocaleString()}`]
  ];
  
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Apply some basic styling through column widths
  summaryWs['!cols'] = [{ wch: 20 }, { wch: 40 }];
  
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  
  // Participants sheet data
  const participantHeaders = ['Name', 'Email', 'Ticket ID', 'Status', 'Amount Paid', 'Booked At', 'Checked In At'];
  const participantRows = participants.map(p => [
    p.userName || 'N/A',
    p.userEmail || 'N/A',
    p.ticketId,
    p.status,
    p.amountPaid === 0 ? 'Free' : `$${p.amountPaid}`,
    formatDate(p.bookedAt),
    p.checkedInAt ? formatDate(p.checkedInAt) : '-'
  ]);
  
  const participantsWs = XLSX.utils.aoa_to_sheet([participantHeaders, ...participantRows]);
  
  // Set column widths
  participantsWs['!cols'] = [
    { wch: 25 }, // Name
    { wch: 35 }, // Email
    { wch: 15 }, // Ticket ID
    { wch: 12 }, // Status
    { wch: 12 }, // Amount
    { wch: 18 }, // Booked At
    { wch: 18 }, // Checked In At
  ];
  
  XLSX.utils.book_append_sheet(wb, participantsWs, 'Participants');
  
  // Save file
  XLSX.writeFile(wb, `${sanitizeFilename(event.title)}_participants.xlsx`);
}

/**
 * Main export function that routes to the appropriate format handler
 */
export async function exportReport(format: ExportFormat, options: ExportOptions): Promise<void> {
  switch (format) {
    case 'csv':
      exportToCSV(options);
      break;
    case 'pdf':
      await exportToPDF(options);
      break;
    case 'excel':
      await exportToExcel(options);
      break;
  }
}

// Helper functions

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function drawStatBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  color: string
): void {
  // Background
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  
  // Left border accent
  const rgb = hexToRgb(color);
  if (rgb) {
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(x, y + 3, 3, height - 6, 'F');
  }
  
  // Label
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(label, x + 10, y + 10);
  
  // Value
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + 10, y + 20);
  doc.setFont('helvetica', 'normal');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
