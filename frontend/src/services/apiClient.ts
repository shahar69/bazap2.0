import api from './axiosInstance';
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('bazap-api-client');

export const eventApi = {
  createEvent: async (sourceUnit: string, receiver: string, type: string) => {
    return tracer.startActiveSpan('eventApi.createEvent', async (span) => {
      span.setAttributes({
        'event.source_unit': sourceUnit,
        'event.receiver': receiver,
        'event.type': type,
      });
      try {
        const typeMap: Record<string, number> = {
          'Receiving': 0,
          'Inspection': 1,
          'Outgoing': 2
        };
        const typeValue = typeMap[type] ?? 0;
        const response = await api.post('/events/create', { sourceUnit, receiver, type: typeValue });
        span.setAttributes({
          'event.created': true,
          'event.id': response.data.id,
        });
        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  },

  getEvent: async (id: number) => {
    return tracer.startActiveSpan('eventApi.getEvent', async (span) => {
      span.setAttribute('event.id', id);
      try {
        const response = await api.get(`/events/${id}`);
        span.setAttribute('event.status', response.data.status);
        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  },

  addItem: async (eventId: number, itemMakat: string, itemName: string, quantity: number) => {
    return tracer.startActiveSpan('eventApi.addItem', async (span) => {
      span.setAttributes({
        'event.id': eventId,
        'item.makat': itemMakat,
        'item.name': itemName,
        'item.quantity': quantity,
      });
      try {
        const response = await api.post(`/events/${eventId}/add-item`, {
          itemMakat,
          itemName,
          quantity,
        });
        span.setAttribute('item.added', true);
        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  },

  removeItem: async (eventId: number, itemId: number) => {
    return tracer.startActiveSpan('eventApi.removeItem', async (span) => {
      span.setAttributes({
        'event.id': eventId,
        'item.id': itemId,
      });
      try {
        const response = await api.post(`/events/${eventId}/remove-item/${itemId}`);
        span.setAttribute('item.removed', true);
        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  },

  completeEvent: async (eventId: number) => {
    return tracer.startActiveSpan('eventApi.completeEvent', async (span) => {
      span.setAttribute('event.id', eventId);
      try {
        const response = await api.post(`/events/${eventId}/complete`);
        span.setAttribute('event.completed', true);
        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  },

  submitForInspection: async (eventId: number) => {
    return tracer.startActiveSpan('eventApi.submitForInspection', async (span) => {
      span.setAttribute('event.id', eventId);
      try {
        const response = await api.post(`/events/${eventId}/submit-for-inspection`);
        span.setAttribute('event.submitted_for_inspection', true);
        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  },

  listEvents: async (status?: string) => {
    return tracer.startActiveSpan('eventApi.listEvents', async (span) => {
      if (status) span.setAttribute('event.filter_status', status);
      try {
        const response = await api.get('/events/list', { params: { status } });
        span.setAttribute('events.count', response.data?.length || 0);
        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  },

  getAllEvents: async () => {
    return tracer.startActiveSpan('eventApi.getAllEvents', async (span) => {
      try {
        const response = await api.get('/events/list');
        span.setAttribute('events.count', response.data?.length || 0);
        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
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
    disableReason?: 'VisualDamage' | 'Scrap' | 'Malfunction' | 'MissingParts' | 'Expired' | 'Calibration' | 'Other',
    notes?: string
  ) => {
    return tracer.startActiveSpan('inspectionApi.makeDecision', async (span) => {
      span.setAttributes({
        'inspection.item_id': eventItemId,
        'inspection.decision': decision,
        'inspection.disable_reason': disableReason || 'none',
        'inspection.has_notes': !!notes,
      });

      try {
        // Backend expects numeric enums; map friendly strings to enum values
        const decisionMap: Record<'Pass' | 'Disabled', number> = {
          Pass: 0,
          Disabled: 1,
        };

        const disableReasonMap: Record<'VisualDamage' | 'Scrap' | 'Malfunction' | 'MissingParts' | 'Expired' | 'Calibration' | 'Other', number> = {
          VisualDamage: 0,
          Scrap: 1,
          Malfunction: 2,
          MissingParts: 3,
          Expired: 4,
          Calibration: 5,
          Other: 6,
        };

        const response = await api.post('/inspection/decide', {
          eventItemId,
          decision: decisionMap[decision],
          disableReason: disableReason ? disableReasonMap[disableReason] : undefined,
          notes,
        });
        span.setAttribute('inspection.decision_recorded', true);
        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  },

  getLabelPreview: async (eventItemId: number) => {
    return tracer.startActiveSpan('inspectionApi.getLabelPreview', async (span) => {
      span.setAttribute('inspection.item_id', eventItemId);
      try {
        const response = await api.get(`/inspection/label-preview/${eventItemId}`);
        span.setAttribute('label.preview_generated', true);
        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  },

  printLabel: async (eventItemId: number, copies: number = 1) => {
    return tracer.startActiveSpan('inspectionApi.printLabel', async (span) => {
      span.setAttributes({
        'inspection.item_id': eventItemId,
        'label.copies': copies,
      });
      try {
        const response = await api.post(
          '/inspection/print-label',
          { eventItemId, copies },
          { responseType: 'blob' }
        );
        span.setAttribute('label.generated', true);
        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  },

  printBatch: async (eventItemIds: number[]) => {
    return tracer.startActiveSpan('inspectionApi.printBatch', async (span) => {
      span.setAttributes({
        'inspection.batch_size': eventItemIds.length,
        'inspection.item_ids': eventItemIds.join(','),
      });
      try {
        const response = await api.post(
          '/inspection/print/batch',
          { eventItemIds },
          { responseType: 'blob' }
        );
        span.setAttribute('batch_labels.generated', true);
        return response.data;
      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  },
};
