import axiosInstance from './axiosInstance';
import { ODataQueryBuilder } from './odataHelper';
import type { ODataResponse } from '@/services/types/odata.types';

export class BaseODataService<T> {
  protected serviceName: string;
  protected entityName: string;
  protected basePath: string;

  constructor(serviceName: string, entityName: string) {
    this.serviceName = serviceName;
    this.entityName = entityName;
    this.basePath = `${serviceName}/${entityName}`;
  }

  // GET - Retrieve list with OData query
  async getList(queryBuilder?: ODataQueryBuilder | null): Promise<ODataResponse<T>> {
    try {
      const queryString = queryBuilder ? `?${queryBuilder.build()}` : '';
      const response = await axiosInstance.get<ODataResponse<T>>(
        `${this.basePath}${queryString}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching list:', error);
      throw error;
    }
  }

  // GET by ID - Retrieve a single entity by key
  // Captures @odata.etag from the response body for optimistic concurrency control.
  async getById(
    id: string | number,
    queryBuilder?: ODataQueryBuilder | null
  ): Promise<T> {
    try {
      const queryString = queryBuilder ? `?${queryBuilder.build()}` : '';
      const response = await axiosInstance.get<T & { '@odata.etag'?: string }>(
        `${this.basePath}(${this.formatKey(id)})${queryString}`
      );
      const data = response.data;
      // Preserve the ETag from the response body for use in subsequent PATCH requests.
      // CAP returns it as '@odata.etag' when the entity has modifiedAt @odata.etag annotation.
      if (data && typeof data === 'object' && '@odata.etag' in data) {
        (data as any).__etag = (data as any)['@odata.etag'];
      }
      return data as T;
    } catch (error) {
      console.error('Error fetching by ID:', error);
      throw error;
    }
  }

  // POST - Create new entity
  // Captures @odata.etag from the response for subsequent bound-action calls.
  async create(data: Partial<T>): Promise<T> {
    try {
      const response = await axiosInstance.post<T & { '@odata.etag'?: string }>(this.basePath, data);
      const result = response.data;
      if (result && typeof result === 'object' && '@odata.etag' in result) {
        (result as any).__etag = (result as any)['@odata.etag'];
      }
      return result as T;
    } catch (error) {
      console.error('Error creating entity:', error);
      throw error;
    }
  }

  // PATCH - Update entity with optimistic concurrency control.
  // CAP entities with @odata.etag require an If-Match header.
  // Pass the etag from getById().__etag to ensure no concurrent overwrites.
  async update(id: string | number, data: Partial<T>, etag?: string): Promise<T> {
    try {
      const headers: Record<string, string> = {};
      if (etag) {
        headers['If-Match'] = etag;
      }
      const response = await axiosInstance.patch<T>(
        `${this.basePath}(${this.formatKey(id)})`,
        data,
        headers['If-Match'] ? { headers } : undefined
      );
      return response.data;
    } catch (error) {
      console.error('Error updating entity:', error);
      throw error;
    }
  }

  // DELETE - Delete entity
  // Pass etag for entities with @odata.etag to satisfy concurrency control.
  async delete(id: string | number, etag?: string): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (etag) {
        headers['If-Match'] = etag;
      }
      await axiosInstance.delete(
        `${this.basePath}(${this.formatKey(id)})`,
        Object.keys(headers).length > 0 ? { headers } : undefined
      );
    } catch (error) {
      console.error('Error deleting entity:', error);
      throw error;
    }
  }

  // Custom action (POST) - Bound action on entity
  async callAction<TResult = any>(
    actionName: string,
    data: Record<string, any> = {}
  ): Promise<TResult> {
    try {
      const response = await axiosInstance.post<TResult>(
        `${this.basePath}/${actionName}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error calling action:', error);
      throw error;
    }
  }

  // Unbound action (POST) - Service-level action
  async callUnboundAction<TResult = any>(
    actionName: string,
    data: Record<string, any> = {}
  ): Promise<TResult> {
    try {
      const response = await axiosInstance.post<TResult>(
        `${this.serviceName}/${actionName}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error calling unbound action:', error);
      throw error;
    }
  }

  // Custom function (GET)
  async callFunction<TResult = any>(
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<TResult> {
    try {
      const queryString = Object.entries(params)
        .map(([key, value]) =>
          `${key}=${encodeURIComponent(this.formatValue(value))}`
        )
        .join('&');

      const response = await axiosInstance.get<TResult>(
        `${this.basePath}/${functionName}${queryString ? '?' + queryString : ''}`
      );
      return response.data;
    } catch (error) {
      console.error('Error calling function:', error);
      throw error;
    }
  }

  // Helper methods
  protected formatKey(id: string | number): string {
    return typeof id === 'string' ? `'${id}'` : String(id);
  }

  protected formatValue(value: any): string {
    if (typeof value === 'string') return `'${value}'`;
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }
}
