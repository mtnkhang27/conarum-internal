/**
 * Document Filter Configuration
 * Centralized filter field definitions for the Dashboard page
 */

import type { FilterFieldConfig, SelectOption } from '@/components/filterbar';
import { axiosInstance } from '@/services/core';
import { populateGlobalStatusLabels } from '@/config/worklist/statusOptionsLoader';

/**
 * Fetches available document types from /odata/v4/extraction/ObjectSchema.
 * Accepts optional allowedObjectTypes to filter down to the user's permitted types (ABAC).
 */
export const createDocumentTypesLoader = (allowedObjectTypes?: string[]) => async (): Promise<SelectOption[]> => {
  try {
    const response = await axiosInstance.get<{ value: { objectType: string; objectDescription?: string }[] }>(
      'odata/v4/extraction/ObjectSchema?$select=objectType,objectDescription'
    );
    let schemas = response.data.value || [];

    // ABAC: filter to only allowed object types if restricted
    if (allowedObjectTypes && allowedObjectTypes.length > 0) {
      schemas = schemas.filter(s => allowedObjectTypes.includes(s.objectType));
    }

    return schemas.map((schema) => ({
      value: schema.objectType,
      label: schema.objectDescription || schema.objectType,
    }));
  } catch (error) {
    console.error('[documentFilterConfig] Failed to load document types:', error);
    return [];
  }
};

/**
 * Fetches system statuses from backend (single source of truth).
 * Used for the Dashboard filter which shows all object types.
 */
const loadSystemStatuses = async (): Promise<SelectOption[]> => {
  try {
    const res = await axiosInstance.get('odata/v4/extraction/getSystemStatuses()');
    const fetched = res.data?.value || res.data;
    if (Array.isArray(fetched) && fetched.length > 0) {
      const options = fetched
        .filter((s: any) => s.showInFilter !== false)
        .map((s: any) => ({ value: s.code, label: s.label || s.code }));
      // Populate global label cache for table rendering
      populateGlobalStatusLabels(fetched.map((s: any) => ({ code: s.code, label: s.label || s.code })));
      return options;
    }
  } catch (error) {
    console.error('[documentFilterConfig] Failed to load system statuses:', error);
  }
  return [
    { value: 'New', label: 'New' },
    { value: 'Extracted', label: 'Extracted' },
    { value: 'Error', label: 'Error' },
    { value: 'Posted', label: 'Posted' },
  ];
};

/** Default config (no ABAC filtering) */
export const documentFilterConfig: FilterFieldConfig[] = [
  {
    key: 'fileName',
    label: 'File Name',
    labelKey: 'dashboard.filters.fileName',
    type: 'text',
    placeholder: 'dashboard.filterPlaceholders.fileName',
  },
  {
    key: 'objectType',
    label: 'Document Type',
    labelKey: 'dashboard.filters.documentType',
    type: 'multiselect',
    placeholder: 'dashboard.filterPlaceholders.allTypes',
    optionsLoader: createDocumentTypesLoader(),
  },
  {
    key: 'overallStatus',
    label: 'Status',
    labelKey: 'dashboard.filters.status',
    type: 'multiselect',
    placeholder: 'dashboard.filterPlaceholders.allStatus',
    optionsLoader: loadSystemStatuses,
  },
  {
    key: 'malwareStatus',
    label: 'Security',
    labelKey: 'dashboard.filters.security',
    type: 'multiselect',
    placeholder: 'dashboard.filterPlaceholders.all',
    options: [
      { value: 'Pending', label: 'Pending' },
      { value: 'Clean', label: 'Clean' },
      { value: 'Infected', label: 'Infected' },
      { value: 'Error', label: 'Error' },
    ],
  },
  {
    key: 'sourceChannel',
    label: 'Source',
    labelKey: 'dashboard.filters.source',
    type: 'multiselect',
    placeholder: 'dashboard.filterPlaceholders.allSources',
    options: [
      { value: 'UI', label: 'UI Upload' },
      { value: 'EMAIL', label: 'Email' },
      { value: 'API', label: 'API' },
    ],
  },
  {
    key: 'uploadedAt',
    label: 'Uploaded At',
    labelKey: 'dashboard.filters.uploadedAt',
    type: 'dateRange',
    numberOfMonths: 2,
    apiTransform: (value: { from?: Date; to?: Date }) => {
      if (!value?.from && !value?.to) return undefined;
      let toISO: string | undefined;
      if (value.to) {
        const endOfDay = new Date(value.to);
        endOfDay.setHours(23, 59, 59, 999);
        toISO = endOfDay.toISOString();
      }
      return {
        from: value.from?.toISOString(),
        to: toISO,
      };
    },
  },
  {
    key: 'uploadedBy',
    label: 'Uploaded By',
    labelKey: 'dashboard.filters.uploadedBy',
    type: 'text',
    placeholder: 'dashboard.filterPlaceholders.searchByUser',
  },
];
