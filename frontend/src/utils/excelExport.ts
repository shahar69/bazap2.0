import ExcelJS from 'exceljs';

interface ExportData {
  title: string;
  fileName: string;
  sheets: {
    name: string;
    data: any[];
    columns?: string[];
  }[];
  autoWidth?: boolean;
}

/**
 * Generate a modern Excel file with styled sheets
 */
export const exportToExcel = async (config: ExportData) => {
  const workbook = new ExcelJS.Workbook();

  config.sheets.forEach((sheet) => {
    const worksheet = workbook.addWorksheet(sheet.name);
    const wsData = sheet.data;

    if (wsData.length > 0) {
      // Get column headers from the first row
      const headers = sheet.columns || Object.keys(wsData[0]);
      
      // Set up columns with headers
      worksheet.columns = headers.map((header) => ({
        header: header,
        key: header,
        width: config.autoWidth ? Math.max(12, header.length + 2) : 15,
      }));

      // Add rows
      wsData.forEach((row) => {
        worksheet.addRow(row);
      });

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { horizontal: 'center' };
    }
  });

  // Generate file and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = config.fileName;
  link.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Export events with items to Excel
 */
export const exportEventsToExcel = async (events: any[], fileName: string = 'אירועים.xlsx') => {
  const summaryData = events.map((event) => ({
    'מס׳ הזמנה': event.orderNumber || event.eventNumber || event.id,
    'סוג הזמנה': getEventTypeName(event.eventType),
    'יחידה מקור': event.sourceUnit,
    'מקבל': event.receiver,
    'מספר פריטים': event.items?.length || 0,
    'סה״כ יחידות': event.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
    'סטטוס': event.statusLabel || getEventStatusName(event.status),
    'תאריך יצירה': formatDateHebrew(event.createdDate),
    'זמן יצירה': formatTimeHebrew(event.createdDate),
  }));

  const itemsData: any[] = [];
  events.forEach((event) => {
    event.items?.forEach((item: any) => {
      itemsData.push({
        'מס׳ הזמנה': event.orderNumber || event.eventNumber || event.id,
        'מק״ט פריט': item.makat,
        'שם פריט': item.name,
        'כמות': item.quantity,
        'סטטוס פריט': item.inspectionStatusLabel || getInspectionActionName(item.inspectionAction),
      });
    });
  });

  await exportToExcel({
    title: 'ייצוא הזמנות',
    fileName,
    sheets: [
      {
        name: 'סיכום הזמנות',
        data: summaryData,
        columns: Object.keys(summaryData[0] || {}) as string[],
      },
      {
        name: 'פריטים',
        data: itemsData,
        columns: Object.keys(itemsData[0] || {}) as string[],
      },
      {
        name: 'סטטיסטיקה',
        data: [
          { 'מדד': 'סה״כ הזמנות', 'ערך': events.length },
          { 'מדד': 'הזמנות פתוחות', 'ערך': events.filter((e) => e.status !== 3).length },
          { 'מדד': 'הזמנות שהושלמו', 'ערך': events.filter((e) => e.status === 3).length },
          { 'מדד': 'סה״כ פריטים', 'ערך': events.reduce((sum, e) => sum + (e.items?.length || 0), 0) },
        ],
      },
    ],
  });
};

/**
 * Export inspection results to Excel
 */
export const exportInspectionsToExcel = async (events: any[], fileName: string = 'בדיקות.xlsx') => {
  const inspectionData: any[] = [];

  events.forEach((event) => {
    event.items?.forEach((item: any) => {
      if (item.inspectionAction) {
        inspectionData.push({
          'מס׳ הזמנה': event.orderNumber || event.eventNumber || event.id,
          'מק״ט': item.makat,
          'שם פריט': item.name,
          'כמות': item.quantity,
          'תוצאה': item.inspectionStatusLabel || getInspectionActionName(item.inspectionAction),
          'סטטוס': item.inspectionAction === 1 ? 'תקין' : item.inspectionAction === 2 ? 'מושבת' : 'ממתין',
          'תאריך': formatDateHebrew(event.createdDate),
        });
      }
    });
  });

  const stats = {
    'סה״כ בדיקות': inspectionData.length,
    'פריטים תקינים': inspectionData.filter((i) => i['תוצאה'] === 'תקין').length,
    'פריטים מושבתים': inspectionData.filter((i) => i['תוצאה'] === 'מושבת').length,
    'שיעור הצלחה': inspectionData.length > 0 
      ? ((inspectionData.filter((i) => i['תוצאה'] === 'תקין').length / inspectionData.length) * 100).toFixed(1) + '%'
      : '0%',
  };

  await exportToExcel({
    title: 'ייצוא תוצאות בדיקה',
    fileName,
    sheets: [
      {
        name: 'תוצאות בדיקה',
        data: inspectionData,
      },
      {
        name: 'סטטיסטיקה',
        data: Object.entries(stats).map(([key, value]) => ({ 'מדד': key, 'ערך': value })),
      },
    ],
  });
};

/**
 * Export items catalog to Excel
 */
export const exportItemsToExcel = (items: any[], fileName: string = 'פריטים.xlsx') => {
  const data = items.map((item) => ({
    'שם פריט': item.name,
    'קוד': item.code || '-',
    'כמות במלאי': item.quantityInStock ?? 0,
    'סטטוס': item.isActive === false ? 'לא פעיל' : 'פעיל',
    'נוצר בתאריך': item.createdAt ? formatDateHebrew(item.createdAt) : '-',
  }));

  exportToExcel({
    title: 'ייצוא פריטים',
    fileName,
    sheets: [
      {
        name: 'פריטים',
        data,
      },
      {
        name: 'סטטיסטיקה',
        data: [
          { 'מדד': 'סה״כ פריטים', 'ערך': items.length },
          { 'מדד': 'פעילים', 'ערך': items.filter((i) => i.isActive !== false).length },
          { 'מדד': 'לא פעילים', 'ערך': items.filter((i) => i.isActive === false).length },
        ],
      },
    ],
  });
};

// Helper functions
function getEventTypeName(type: number): string {
  const types: { [key: number]: string } = {
    0: 'קבלת ציוד',
    1: 'החזרת ציוד',
    2: 'ניפוק ציוד',
    3: 'בדיקת ציוד',
  };
  return types[type] || 'לא ידוע';
}

function getEventStatusName(status: number): string {
  if (status === 3) return 'הושלם';
  if (status === 2) return 'בבחינה';
  if (status === 1) return 'ממתין לבחינה';
  return 'טיוטה';
}

function getInspectionActionName(action: number): string {
  const actions: { [key: number]: string } = {
    0: 'ממתין לבדיקה',
    1: 'תקין',
    2: 'מושבת',
  };
  return actions[action] || 'לא ידוע';
}

function formatDateHebrew(date: string): string {
  return new Date(date).toLocaleDateString('he-IL');
}

function formatTimeHebrew(date: string): string {
  return new Date(date).toLocaleTimeString('he-IL');
}
