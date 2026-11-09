/** Operation values accepted by the metrics API. */
export type OperationType = "income" | "outcome";

/** Business segment values accepted by the metrics API. */
export type BusinessType = "B2B" | "B2C";

/** Category values returned by the metrics API. */
export type Category =
  | "suppliers"
  | "sales"
  | "operational"
  | "administrative"
  | "others";

/** Period aggregation values accepted by summary and alerts endpoints. */
export type GroupBy = "day" | "week" | "month";

/** Available filter values and the inclusive date bounds in the dataset. */
export interface FacetsResponse {
  /**
   * Operation values present in the dataset; each entry is `income` or
   * `outcome`.
   */
  operation_types: OperationType[];
  /** Business segments present in the dataset; entries are `B2B` or `B2C`. */
  business_types: BusinessType[];
  /** Available transaction categories from the `Category` union. */
  categories: Category[];
  /** Earliest available transaction date, formatted as `YYYY-MM-DD`. */
  min_date: string;
  /** Latest available transaction date, formatted as `YYYY-MM-DD`. */
  max_date: string;
}

/** An outcome anomaly returned by `GET /api/metrics/alerts`. */
export interface AlertEntry {
  /**
   * Aggregation period: `YYYY-MM-DD` for day, `YYYY-Www` for week, or
   * `YYYY-MM` for month.
   */
  period: string;
  /** Sum of recorded outcome amounts in this period, in currency units. */
  outcome_total: number;
  /**
   * Mean outcome amount for all earlier returned periods in the selected
   * range, in currency units; this is not limited to the preceding 3 periods.
   */
  baseline_average: number;
  /**
   * Relative increase over `baseline_average`, rounded to 4 decimal places;
   * `0.3` represents a 30% increase.
   */
  increase_ratio: number;
}

/** Array response from `GET /api/metrics/alerts`; it can be empty. */
export type AlertsResponse = AlertEntry[];

/** A category total returned by `GET /api/metrics/categories/top`. */
export interface CategoryEntry {
  /** Category identifier from the `Category` union. */
  category: Category;
  /** Operation to which this total belongs; one of `income` or `outcome`. */
  operation_type: OperationType;
  /** Sum for this category and operation in currency units, rounded to 2 decimals. */
  total_amount: number;
}

/** Array response from `GET /api/metrics/categories/top`; it can be empty. */
export type TopCategoriesResponse = CategoryEntry[];

/** One period of data returned by `GET /api/metrics/summary`. */
export interface MetricsSummaryEntry {
  /**
   * Aggregation period: `YYYY-MM-DD` for day, `YYYY-Www` for week, or
   * `YYYY-MM` for month.
   */
  period: string;
  /** Total income for this period, in currency units, rounded to 2 decimals. */
  income: number;
  /** Total outcome for this period, in currency units, rounded to 2 decimals. */
  outcome: number;
  /** Income minus outcome for this period, in currency units. */
  net: number;
}

/** Array response from `GET /api/metrics/summary`; it can be empty. */
export type MetricsSummaryResponse = MetricsSummaryEntry[];