import * as XLSX from 'xlsx';

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
export const exportToExcel = (config: ExportData) => {
  const workbook = XLSX.utils.book_new();

  config.sheets.forEach((sheet) => {
    const wsData = sheet.data;
    const ws = XLSX.utils.json_to_sheet(wsData);

    // Set column widths if provided
    if (sheet.columns) {
      const colWidths = sheet.columns.map((col) => ({
        wch: Math.max(12, col.length + 2),
      }));
      ws['!cols'] = colWidths;
    } else if (config.autoWidth) {
      // Auto width based on content
      const colWidths = Object.keys(wsData[0] || {}).map((key) => ({
        wch: Math.max(12, key.length + 2),
      }));
      ws['!cols'] = colWidths;
    }

    XLSX.utils.book_append_sheet(workbook, ws, sheet.name);
  });

  // Generate file
  XLSX.writeFile(workbook, config.fileName);
};

/**
 * Export events with items to Excel
 */
export const exportEventsToExcel = (events: any[], fileName: string = 'אירועים.xlsx') => {
  const summaryData = events.map((event) => ({
    'מס׳ אירוע': event.eventNumber || event.id,
    'סוג אירוע': getEventTypeName(event.eventType),
    'יחידה מקור': event.sourceUnit,
    'מקבל': event.receiver,
    'מספר פריטים': event.items?.length || 0,
    'סה״כ יחידות': event.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
    'סטטוס': getEventStatusName(event.status),
    'תאריך יצירה': formatDateHebrew(event.createdDate),
    'זמן יצירה': formatTimeHebrew(event.createdDate),
  }));

  const itemsData: any[] = [];
  events.forEach((event) => {
    event.items?.forEach((item: any) => {
      itemsData.push({
        'מס׳ אירוע': event.eventNumber || event.id,
        'מק״ט פריט': item.makat,
        'שם פריט': item.name,
        'כמות': item.quantity,
        'פעולת בדיקה': getInspectionActionName(item.inspectionAction),
      });
    });
  });

  exportToExcel({
    title: 'ייצוא אירועים',
    fileName,
    sheets: [
      {
        name: 'סיכום אירועים',
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
          { 'מדד': 'סה״כ אירועים', 'ערך': events.length },
          { 'מדד': 'אירועים פעילים', 'ערך': events.filter((e) => e.status === 0).length },
          { 'מדד': 'אירועים הושלמו', 'ערך': events.filter((e) => e.status === 1).length },
          { 'מדד': 'סה״כ פריטים', 'ערך': events.reduce((sum, e) => sum + (e.items?.length || 0), 0) },
        ],
      },
    ],
  });
};

/**
 * Export inspection results to Excel
 */
export const exportInspectionsToExcel = (events: any[], fileName: string = 'בדיקות.xlsx') => {
  const inspectionData: any[] = [];

  events.forEach((event) => {
    event.items?.forEach((item: any) => {
      if (item.inspectionAction) {
        inspectionData.push({
          'מס׳ אירוע': event.eventNumber || event.id,
          'מק״ט': item.makat,
          'שם פריט': item.name,
          'כמות': item.quantity,
          'תוצאה': getInspectionActionName(item.inspectionAction),
          'סטטוס': item.inspectionAction === 1 ? 'עבר' : item.inspectionAction === 2 ? 'נכשל' : 'ממתין',
          'תאריך': formatDateHebrew(event.createdDate),
        });
      }
    });
  });

  const stats = {
    'סה״כ בדיקות': inspectionData.length,
    'עברו בדיקה': inspectionData.filter((i) => i['תוצאה'] === 'עבר').length,
    'נכשלו בדיקה': inspectionData.filter((i) => i['תוצאה'] === 'נכשל').length,
    'שיעור הצלחה': inspectionData.length > 0 
      ? ((inspectionData.filter((i) => i['תוצאה'] === 'עבר').length / inspectionData.length) * 100).toFixed(1) + '%'
      : '0%',
  };

  exportToExcel({
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
  return status === 0 ? 'פעיל' : status === 1 ? 'הושלם' : 'בוטל';
}

function getInspectionActionName(action: number): string {
  const actions: { [key: number]: string } = {
    0: 'ממתין לבדיקה',
    1: 'עבר בדיקה',
    2: 'נכשל בדיקה',
  };
  return actions[action] || 'לא ידוע';
}

function formatDateHebrew(date: string): string {
  return new Date(date).toLocaleDateString('he-IL');
}

function formatTimeHebrew(date: string): string {
  return new Date(date).toLocaleTimeString('he-IL');
}
