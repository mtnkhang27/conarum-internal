import { BaseODataService } from './core/baseService';
import { ODataQueryBuilder } from './core/odataHelper';

/**
 * Example Entity Interface
 * Define your entity structure based on your OData service
 */
export interface Product {
    ID: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
    createdAt?: string;
    modifiedAt?: string;
}

/**
 * Example Service Class
 * Extend BaseODataService for type-safe CRUD operations
 */
class ProductService extends BaseODataService<Product> {
    constructor() {
        // serviceName: OData service name
        // entityName: Entity set name
        super('ProductService', 'Products');
    }

    /**
     * Custom method example: Get products by category
     */
    async getByCategory(category: string) {
        const queryBuilder = this.createQueryBuilder()
            .filter(`category eq '${category}'`)
            .orderBy('name')
            .top(50);

        return this.getList(queryBuilder);
    }

    /**
     * Custom method example: Search products
     */
    async search(searchTerm: string) {
        const queryBuilder = this.createQueryBuilder()
            .filter(`contains(name, '${searchTerm}') or contains(description, '${searchTerm}')`)
            .select(['ID', 'name', 'description', 'price'])
            .top(20);

        return this.getList(queryBuilder);
    }

    // Helper to create query builder
    private createQueryBuilder() {
        return new ODataQueryBuilder();
    }
}

export const productService = new ProductService();
