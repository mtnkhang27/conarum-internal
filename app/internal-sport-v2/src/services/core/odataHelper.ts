
type SortDirection = 'asc' | 'desc';

interface QueryParams {
  $top?: number;
  $skip?: number;
  $filter?: string;
  $select?: string;
  $expand?: string;
  $orderby?: string;
  $count?: boolean;
  $search?: string;
  [key: string]: string | number | boolean | undefined;
}

export class ODataQueryBuilder {
  private params: QueryParams = {};

  // $top - Limit number of records
  top(value: number): this {
    this.params.$top = value;
    return this;
  }

  // $skip - Skip number of records (pagination)
  skip(value: number): this {
    this.params.$skip = value;
    return this;
  }

  // $filter - Filter data
  filter(condition: string): this {
    this.params.$filter = condition;
    return this;
  }

  // $select - Select specific fields to retrieve
  select(fields: string | string[]): this {
    this.params.$select = Array.isArray(fields) ? fields.join(',') : fields;
    return this;
  }

  // $expand - Expand navigation properties
  expand(navigation: string): this {
    this.params.$expand = navigation;
    return this;
  }

  // $orderby - Sort results
  orderBy(field: string, direction: SortDirection = 'asc'): this {
    this.params.$orderby = `${field} ${direction}`;
    return this;
  }

  // $count - Count total records
  count(value: boolean = true): this {
    this.params.$count = value;
    return this;
  }

  // $search - Full-text search
  search(term: string): this {
    this.params.$search = term;
    return this;
  }

  // Build query string
  build(): string {
    return Object.entries(this.params)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');
  }

  // Reset builder
  reset(): this {
    this.params = {};
    return this;
  }

  // Get raw params object
  getParams(): QueryParams {
    return { ...this.params };
  }
}

function formatValue(value: string | number | boolean | Date): string {
  if (typeof value === 'string') {
    return `'${value}'`;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

// Helper function to create filter conditions
export const ODataFilter = {
  eq: (field: string, value: string | number | boolean | Date): string =>
    `${field} eq ${formatValue(value)}`,

  ne: (field: string, value: string | number | boolean | Date): string =>
    `${field} ne ${formatValue(value)}`,

  gt: (field: string, value: string | number | Date): string =>
    `${field} gt ${formatValue(value)}`,

  ge: (field: string, value: string | number | Date): string =>
    `${field} ge ${formatValue(value)}`,

  lt: (field: string, value: string | number | Date): string =>
    `${field} lt ${formatValue(value)}`,

  le: (field: string, value: string | number | Date): string =>
    `${field} le ${formatValue(value)}`,

  contains: (field: string, value: string): string =>
    `contains(${field},${formatValue(value)})`,

  containsIgnoreCase: (field: string, value: string): string =>
    `contains(tolower(${field}),tolower(${formatValue(value)}))`,

  startsWith: (field: string, value: string): string =>
    `startswith(${field},${formatValue(value)})`,

  endsWith: (field: string, value: string): string =>
    `endswith(${field},${formatValue(value)})`,

  and: (...conditions: string[]): string =>
    `(${conditions.join(' and ')})`,

  or: (...conditions: string[]): string =>
    `(${conditions.join(' or ')})`,

  not: (condition: string): string =>
    `not (${condition})`,

  in: (field: string, values: (string | number)[]): string =>
    `${field} in (${values.map(v => formatValue(v as any)).join(',')})`,
};
