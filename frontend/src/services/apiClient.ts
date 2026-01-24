import api from './axiosInstance';

export const eventApi = {
  createEvent: async (sourceUnit: string, receiver: string, type: string) => {
    // Convert type string to EventType enum value
    const typeMap: Record<string, number> = {
      'Receiving': 0,
      'Inspection': 1,
      'Outgoing': 2
    };
    const typeValue = typeMap[type] ?? 0;
    const response = await api.post('/events/create', { sourceUnit, receiver, type: typeValue });
    return response.data;
  },

  getEvent: async (id: number) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  addItem: async (eventId: number, itemMakat: string, itemName: string, quantity: number) => {
    const response = await api.post(`/events/${eventId}/add-item`, {
      itemMakat,
      itemName,
      quantity,
    });
    return response.data;
  },

  removeItem: async (eventId: number, itemId: number) => {
    const response = await api.post(`/events/${eventId}/remove-item/${itemId}`);
    return response.data;
  },

  completeEvent: async (eventId: number) => {
    const response = await api.post(`/events/${eventId}/complete`);
    return response.data;
  },

  submitForInspection: async (eventId: number) => {
    const response = await api.post(`/events/${eventId}/submit-for-inspection`);
    return response.data;
  },

  listEvents: async (status?: string) => {
    const response = await api.get('/events/list', { params: { status } });
    return response.data;
  },
};

export const itemSearchApi = {
  search: async (query: string, limit: number = 10) => {
    const response = await api.post('/itemssearch/search', { query, limit });
    return response.data;
  },

  getGroups: async () => {
    const response = await api.get('/itemssearch/groups');
    return response.data;
  },

  getRecent: async (limit: number = 5) => {
    const response = await api.get('/itemssearch/recent', { params: { limit } });
    return response.data;
  },

  getFrequent: async (limit: number = 10) => {
    const response = await api.get('/itemssearch/frequent', { params: { limit } });
    return response.data;
  },
};

export const inspectionApi = {
  makeDecision: async (
    eventItemId: number,
    decision: 'Pass' | 'Disabled',
    disableReason?: 'VisualDamage' | 'Scrap' | 'Other',
    notes?: string
  ) => {
    // Backend expects numeric enums; map friendly strings to enum values
    const decisionMap: Record<'Pass' | 'Disabled', number> = {
      Pass: 0,
      Disabled: 1,
    };

    const disableReasonMap: Record<'VisualDamage' | 'Scrap' | 'Other', number> = {
      VisualDamage: 0,
      Scrap: 1,
      Other: 2,
    };

    const response = await api.post('/inspection/decide', {
      eventItemId,
      decision: decisionMap[decision],
      disableReason: disableReason ? disableReasonMap[disableReason] : undefined,
      notes,
    });
    return response.data;
  },

  getLabelPreview: async (eventItemId: number) => {
    const response = await api.get(`/inspection/label-preview/${eventItemId}`);
    return response.data;
  },

  printLabel: async (eventItemId: number, copies: number = 1) => {
    const response = await api.post(
      '/inspection/print-label',
      { eventItemId, copies },
      { responseType: 'blob' }
    );
    return response.data;
  },

  printBatch: async (eventItemIds: number[]) => {
    const response = await api.post(
      '/inspection/print/batch',
      { eventItemIds },
      { responseType: 'blob' }
    );
    return response.data;
  },
};
