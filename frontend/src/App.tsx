import { useEffect, useState } from "react";
import { ChartColumn, LayoutDashboard, RotateCcw } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { KPIRow } from "@/components/dashboard/kpi-row";
import { IncomeOutcomeChart } from "@/components/dashboard/income-outcome-chart";
import { ProfitPercentChart } from "@/components/dashboard/profit-percent-chart";
import { AlertsTable, BusinessComparison } from "@/components/dashboard/financial-details";
import { fetchApi, fetchDashboard, type DashboardData, type FacetsResponse } from "@/lib/financial-api";
import { computeKPIs, computeMonthlyData } from "@/lib/financial-utils";

function App() {
  const [view, setView] = useState<"dashboard" | "comparison">(
    () => window.location.hash === "#comparativa" ? "comparison" : "dashboard",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [threshold, setThreshold] = useState("0.3");
  const [facets, setFacets] = useState<FacetsResponse | null>(null);
  const [facetsError, setFacetsError] = useState(false);
  const [result, setResult] = useState<{
    key: string;
    data: DashboardData | null;
    error: string | null;
  } | null>(null);

  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const dates = params.toString();
  const thresholdValid = threshold !== "" && Number(threshold) >= 0.01 && Number(threshold) <= 1;
  const activeThreshold = thresholdValid ? Number(threshold) : 0.3;
  const rangeValid = (!startDate || !endDate || startDate <= endDate) &&
    (!facets || ((!startDate || (startDate >= facets.min_date && startDate <= facets.max_date)) &&
      (!endDate || (endDate >= facets.min_date && endDate <= facets.max_date))));
  const requestKey = `${view}:${dates}:${view === "dashboard" ? activeThreshold : ""}`;
  const loading = rangeValid && result?.key !== requestKey;
  const data = result?.key === requestKey ? result.data : null;
  const error = result?.key === requestKey ? result.error : null;
  const metrics = data ? computeKPIs(data.movements) : null;
  const monthlyData = data ? computeMonthlyData(data.movements) : [];

  useEffect(() => {
    const updateView = () => setView(window.location.hash === "#comparativa" ? "comparison" : "dashboard");
    window.addEventListener("hashchange", updateView);
    return () => window.removeEventListener("hashchange", updateView);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<FacetsResponse>("/facets", controller.signal)
      .then(setFacets)
      .catch(() => {
        if (!controller.signal.aborted) setFacetsError(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!rangeValid) return;
    const controller = new AbortController();
    fetchDashboard(view, dates, activeThreshold, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data: response, error: null });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, data: null, error: "No se pudo cargar la informacion financiera. Revisa la API de backend." });
        }
      });
    return () => controller.abort();
  }, [view, dates, activeThreshold, requestKey, rangeValid]);

  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <DashboardHeader period={startDate || endDate ? `${startDate || facets?.min_date || "Inicio"} - ${endDate || facets?.max_date || "Fin"}` : "Todo el periodo disponible"} />

          <nav aria-label="Vistas financieras" className="flex flex-wrap gap-2 border-b border-border pb-4">
            <a href="#dashboard" aria-current={view === "dashboard" ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm ${view === "dashboard" ? "bg-secondary font-semibold" : "text-muted-foreground"}`}>
              <LayoutDashboard size={16} aria-hidden="true" />Dashboard
            </a>
            <a href="#comparativa" aria-current={view === "comparison" ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm ${view === "comparison" ? "bg-secondary font-semibold" : "text-muted-foreground"}`}>
              <ChartColumn size={16} aria-hidden="true" />B2B vs. B2C
            </a>
          </nav>

          <section aria-label="Rango de fechas" className="space-y-3">
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex min-w-0 flex-col gap-2 text-sm">
                Fecha de inicio
                <input type="date" value={startDate} min={facets?.min_date} max={endDate || facets?.max_date} onChange={(event) => setStartDate(event.target.value)} aria-invalid={!rangeValid} className="max-w-full rounded-md border border-input bg-background px-3 py-2 [color-scheme:dark]" />
              </label>
              <label className="flex min-w-0 flex-col gap-2 text-sm">
                Fecha de fin
                <input type="date" value={endDate} min={startDate || facets?.min_date} max={facets?.max_date} onChange={(event) => setEndDate(event.target.value)} aria-invalid={!rangeValid} className="max-w-full rounded-md border border-input bg-background px-3 py-2 [color-scheme:dark]" />
              </label>
              <button type="button" title="Limpiar fechas" aria-label="Limpiar fechas" disabled={!startDate && !endDate} onClick={() => { setStartDate(""); setEndDate(""); }} className="flex h-10 w-10 items-center justify-center rounded-md border border-input disabled:opacity-40">
                <RotateCcw size={16} aria-hidden="true" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground" role="status">
              {facets ? `Rango disponible: ${facets.min_date} - ${facets.max_date}` : facetsError ? "No se pudo obtener el rango disponible." : "Cargando rango disponible..."}
            </p>
            {!rangeValid && <p role="alert" className="text-sm text-red-400">Selecciona fechas dentro del rango disponible, con inicio anterior o igual al fin.</p>}
          </section>

          {error || facetsError ? (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
              {error || "No se pudieron cargar las opciones de la API. Recarga la pagina para reintentar."}
            </div>
          ) : null}

          {rangeValid && !error && (view === "dashboard" ? (
            <>
              <section aria-label="Key performance indicators">
                <KPIRow metrics={metrics} loading={loading} />
              </section>
              <section aria-label="Financial charts" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <IncomeOutcomeChart data={monthlyData} loading={loading} />
                <ProfitPercentChart data={monthlyData} loading={loading} />
              </section>
              <AlertsTable alerts={data?.alerts ?? []} threshold={threshold} onThresholdChange={setThreshold} loading={loading} />
            </>
          ) : loading || !facets ? (
            <p role="status">{facetsError ? "Comparativa no disponible sin las categorias de la API." : "Cargando comparativa..."}</p>
          ) : (
            <BusinessComparison groups={data?.comparison ?? []} facets={facets} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default App;
