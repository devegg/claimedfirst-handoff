export const PAGE_SIZE = 10;
export type PageWindow = { page: number; pageCount: number; from: number; to: number; hasPrev: boolean; hasNext: boolean };

export function pageWindow(page: number, total: number, pageSize = PAGE_SIZE): PageWindow {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError("pageSize must be a positive integer");
  const t = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const pageCount = Math.max(1, Math.ceil(t / pageSize));
  const wanted = Number.isNaN(page) ? 1 : page === Infinity ? pageCount : Math.floor(page);
  const p = Math.min(pageCount, Math.max(1, wanted));
  const from = (p - 1) * pageSize;
  const to = Math.min(t, from + pageSize) - 1;
  return { page: p, pageCount, from, to, hasPrev: p > 1, hasNext: p < pageCount };
}
