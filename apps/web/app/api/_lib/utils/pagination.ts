import type { PaginationMeta, PaginationLinks } from './response.js';

export interface PaginateInput {
  page: number;
  limit: number;
  total: number;
  basePath: string;
}

export interface PaginateResult {
  meta: PaginationMeta;
  links: PaginationLinks;
  offset: number;
}

/**
 * Calculate pagination metadata, links, and SQL offset.
 */
export function paginate({ page, limit, total, basePath }: PaginateInput): PaginateResult {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
  const offset = (page - 1) * limit;

  const buildUrl = (p: number) => {
    const url = new URL(basePath, 'http://placeholder');
    url.searchParams.set('page', String(p));
    url.searchParams.set('limit', String(limit));
    return `${url.pathname}${url.search}`;
  };

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    links: {
      self: buildUrl(page),
      next: page < totalPages ? buildUrl(page + 1) : null,
      prev: page > 1 ? buildUrl(page - 1) : null,
      first: buildUrl(1),
      last: totalPages > 0 ? buildUrl(totalPages) : buildUrl(1),
    },
    offset,
  };
}
