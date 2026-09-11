export function parsePagination(
  searchParams: URLSearchParams,
  options: { defaultLimit: number; maxLimit: number },
) {
  const requestedPage = Number.parseInt(searchParams.get("page") || "", 10);
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "", 10);
  const page = Number.isInteger(requestedPage) && requestedPage >= 1 ? Math.min(requestedPage, 100_000) : 1;
  const limit = Number.isInteger(requestedLimit) && requestedLimit >= 1
    ? Math.min(requestedLimit, options.maxLimit)
    : options.defaultLimit;
  const offset = (page - 1) * limit;

  return { page, limit, offset, from: offset, to: offset + limit - 1 };
}
