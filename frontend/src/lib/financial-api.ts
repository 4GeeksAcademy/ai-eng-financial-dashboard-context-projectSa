import type {
  AlertEntry,
  BusinessType,
  CategoryEntry,
  FacetsResponse,
  MetricsSummaryEntry,
} from "../../specs/api-types";
import type { FinancialMovement } from "./financial-types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export type { AlertEntry, FacetsResponse };

export interface BusinessIncome {
  business: BusinessType;
  categories: CategoryEntry[];
  total: number;
}

export interface DashboardData {
  movements: FinancialMovement[];
  alerts: AlertEntry[];
  comparison: BusinessIncome[];
}

export async function fetchApi<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/metrics${path}`, { signal });
  if (!response.ok) {
    throw new Error(`Error de API: ${response.status}`);
  }
  return response.json();
}

export async function fetchDashboard(
  view: "dashboard" | "comparison",
  dates: string,
  threshold: number,
  signal: AbortSignal,
): Promise<DashboardData> {
  if (view === "dashboard") {
    const alertParams = new URLSearchParams(dates);
    alertParams.set("threshold", String(threshold));
    const [movements, alerts] = await Promise.all([
      fetchApi<FinancialMovement[]>(`?${dates}`, signal),
      fetchApi<AlertEntry[]>(`/alerts?${alertParams}`, signal),
    ]);
    return { movements, alerts, comparison: [] };
  }

  const comparison = await Promise.all(
    (["B2B", "B2C"] as const).map(async (business) => {
      const params = new URLSearchParams(dates);
      params.set("operation_type", "income");
      params.set("business_type", business);
      params.set("limit", "5");
      const [categories, summary] = await Promise.all([
        fetchApi<CategoryEntry[]>(`/categories/top?${params}`, signal),
        fetchApi<MetricsSummaryEntry[]>(`/summary?${params}`, signal),
      ]);
      return {
        business,
        categories,
        total: summary.reduce((total, item) => total + item.income, 0),
      };
    }),
  );
  return { movements: [], alerts: [], comparison };
}