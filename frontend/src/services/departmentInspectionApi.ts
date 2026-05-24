import api from './api';

export type Decision = 'Pass' | 'Disabled';
export type DisableReason = 'VisualDefect' | 'Scrap' | 'Exceptional' | 'Cleaning';

export interface InspectionRecord {
  id: number;
  makat?: string;
  itemName?: string;
  quantity: number;
  decision: Decision;
  disableReason?: DisableReason;
  notes?: string;
  inspectedAt: string;
  inspectedBy: string;
  sourceUnit?: string;
}

export interface InspectionRecordRequest {
  makat?: string;
  itemName?: string;
  quantity: number;
  decision: Decision;
  disableReason?: DisableReason;
  notes?: string;
  inspectedBy: string;
  sourceUnit?: string;
}

export interface CommanderReport {
  from: string;
  to: string;
  totalQuantity: number;
  disabledQuantity: number;
  passedQuantity: number;
  exceptionalQuantity: number;
  disableReasons: Array<{ reason: string; label: string; quantity: number; recordCount: number }>;
  exceptionalItems: Array<{ makat?: string; itemName?: string; quantity: number; notes?: string; sourceUnit?: string; inspectedAt: string }>;
  disabledItems: Array<{ makat?: string; itemName?: string; quantity: number }>;
  repeatedSources: Array<{ sourceUnit: string; quantity: number; recordCount: number }>;
}

export interface RecordFilters {
  from?: string;
  to?: string;
  decision?: Decision;
  onlyExceptional?: boolean;
}

export interface DisableLabelRequest {
  recordIds: number[];
  mode: 'Quantity' | 'Single';
  inspectedBy?: string;
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const printHtmlBlob = async (blob: Blob, targetWindow?: Window | null) => {
  const html = await blob.text();
  const printWindow = targetWindow ?? window.open('', '_blank', 'width=420,height=640');
  if (!printWindow) {
    downloadBlob(new Blob([html], { type: 'text/html' }), `disable-label-${new Date().toISOString().slice(0, 10)}.html`);
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 350);
};

export const decisionLabels: Record<Decision, string> = {
  Pass: 'תקין',
  Disabled: 'מושבת',
};

export const disableReasonLabels: Record<DisableReason, string> = {
  VisualDefect: 'לקוי ויזואלית',
  Scrap: 'גריטה',
  Exceptional: 'חריג',
  Cleaning: 'ניקיון',
};

export const departmentInspectionApi = {
  listRecords: async (filters?: RecordFilters): Promise<InspectionRecord[]> => {
    const response = await api.get('/department-inspection/records', { params: filters });
    return response.data;
  },
  createRecord: async (request: InspectionRecordRequest): Promise<InspectionRecord> => {
    const response = await api.post('/department-inspection/records', request);
    return response.data;
  },
  getReport: async (filters?: { from?: string; to?: string }): Promise<CommanderReport> => {
    const response = await api.get('/department-inspection/report', { params: filters });
    return response.data;
  },
  downloadLabels: async (request: DisableLabelRequest) => {
    const response = await api.post('/department-inspection/labels', request, { responseType: 'blob' });
    downloadBlob(response.data, `disable-labels-${new Date().toISOString().slice(0, 10)}.html`);
  },
  printLabels: async (request: DisableLabelRequest, targetWindow?: Window | null) => {
    const response = await api.post('/department-inspection/labels', request, { responseType: 'blob' });
    await printHtmlBlob(response.data, targetWindow);
  },
  downloadSapCsv: async (filters?: { from?: string; to?: string }) => {
    const response = await api.get('/department-inspection/sap-export', {
      params: filters,
      responseType: 'blob',
    });
    downloadBlob(response.data, `sap-export-${new Date().toISOString().slice(0, 10)}.csv`);
  },
};
