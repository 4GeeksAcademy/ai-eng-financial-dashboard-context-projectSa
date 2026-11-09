import type {
  BusinessType,
  GroupBy,
  OperationType,
} from "./api-types";

/** Optional inclusive date bounds accepted by date-filtered metrics endpoints. */
export interface DateRangeFilter {
  /**
   * Optional inclusive lower bound formatted as `YYYY-MM-DD`; omitted means
   * no lower bound.
   */
  start_date?: string;
  /**
   * Optional inclusive upper bound formatted as `YYYY-MM-DD`; omitted means
   * no upper bound.
   */
  end_date?: string;
}

/** Query parameters accepted by `GET /api/metrics/alerts`. */
export interface AlertsParams extends DateRangeFilter {
  /**
   * Alert cutoff as a decimal ratio. The UI constrains input to `0.01`–`1.0`
   * with default `0.3`; the API itself accepts any number greater than or equal
   * to `0` and has no upper bound.
   */
  threshold?: number;
  /**
   * Period aggregation; one of `day`, `week`, or `month`. API default: `month`.
   */
  group_by?: GroupBy;
  /** Optional segment filter; one of `B2B` or `B2C`. */
  business_type?: BusinessType;
}

/** Query parameters accepted by `GET /api/metrics/categories/top`. */
export interface TopCategoriesParams extends DateRangeFilter {
  /**
   * Optional operation filter: `income` or `outcome`. API default: `outcome`;
   * the comparison feature sends `income`.
   */
  operation_type?: OperationType;
  /** Number of results, integer from `1` through `20`; API default: `5`. */
  limit?: number;
  /** Optional segment filter; one of `B2B` or `B2C`. */
  business_type?: BusinessType;
}

/** Query parameters used to obtain segment income totals from summary data. */
export interface MetricsSummaryParams extends DateRangeFilter {
  /**
   * Period aggregation; one of `day`, `week`, or `month`. API default: `month`.
   */
  group_by?: GroupBy;
  /** Optional operation filter; the comparison feature sends `income`. */
  operation_type?: OperationType;
  /** Segment whose totals are requested; one of `B2B` or `B2C`. */
  business_type?: BusinessType;
}