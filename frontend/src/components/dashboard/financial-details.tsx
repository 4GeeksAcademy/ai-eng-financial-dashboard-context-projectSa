import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AlertEntry,
  BusinessIncome,
  FacetsResponse,
} from "@/lib/financial-api";
import { formatCurrency, formatPercent } from "@/lib/financial-utils";

const tableClass = "w-full text-left text-sm [&_th]:px-4 [&_th]:py-3 [&_th]:font-medium [&_td]:px-4 [&_td]:py-3 [&_tbody_tr]:border-t [&_tbody_tr]:border-border";

export function AlertsTable({
  alerts,
  threshold,
  onThresholdChange,
  loading,
}: {
  alerts: AlertEntry[];
  threshold: string;
  onThresholdChange: (value: string) => void;
  loading: boolean;
}) {
  const valid = threshold !== "" && Number(threshold) >= 0.01 && Number(threshold) <= 1;

  return (
    <section aria-labelledby="alerts-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="alerts-title" className="text-lg font-semibold">Alertas de gastos</h2>
        <label className="flex flex-col gap-2 text-sm">
          Umbral de incremento (ratio)
          <input
            type="number"
            min="0.01"
            max="1"
            step="0.01"
            required
            value={threshold}
            onChange={(event) => onThresholdChange(event.target.value)}
            aria-invalid={!valid}
            aria-describedby={!valid ? "threshold-error" : undefined}
            className="w-44 rounded-md border border-input bg-background px-3 py-2"
          />
        </label>
      </div>
      {!valid && <p id="threshold-error" role="alert" className="text-sm text-red-400">El umbral debe estar entre 0.01 y 1.0.</p>}
      <div className="overflow-x-auto rounded-lg border border-border" aria-busy={loading}>
        <table className={tableClass}>
          <caption className="sr-only">Anomalias respecto a los tres periodos anteriores</caption>
          <thead className="bg-secondary">
            <tr>
              <th scope="col">Periodo</th>
              <th scope="col">Gasto registrado</th>
              <th scope="col">Media movil (3 periodos)</th>
              <th scope="col">Incremento</th>
            </tr>
          </thead>
          <tbody>
            {!valid || loading || alerts.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-muted-foreground" role="status">
                {!valid ? "Introduce un umbral valido." : loading ? "Cargando alertas..." : "No se detectaron anomalias para este umbral y rango de fechas."}
              </td></tr>
            ) : alerts.map((alert) => (
              <tr key={alert.period}>
                <th scope="row">{alert.period}</th>
                <td>{formatCurrency(alert.outcome_total)}</td>
                <td>{formatCurrency(alert.baseline_average)}</td>
                <td className="font-medium text-amber-400">{formatPercent(alert.increase_ratio * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BusinessComparison({
  groups,
  facets,
}: {
  groups: BusinessIncome[];
  facets: FacetsResponse;
}) {
  return (
    <section aria-labelledby="comparison-title" className="space-y-8">
      <h2 id="comparison-title" className="text-lg font-semibold">Ingresos B2B vs. B2C</h2>
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        {groups.map((group) => (
          <section key={group.business} aria-labelledby={`title-${group.business}`} className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 id={`title-${group.business}`} className="font-semibold">{group.business}</h3>
              <p className="text-sm">Total: {formatCurrency(group.total)}</p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className={tableClass}>
                <caption className="sr-only">Top 5 categorias de ingreso de {group.business}</caption>
                <thead className="bg-secondary"><tr>
                  <th scope="col">Categoria</th>
                  <th scope="col">Ingresos</th>
                  <th scope="col">% del grupo</th>
                </tr></thead>
                <tbody>
                  {group.categories.length === 0 ? (
                    <tr><td colSpan={3} className="text-center text-muted-foreground">Sin ingresos en el rango seleccionado.</td></tr>
                  ) : group.categories.map((item) => (
                    <tr key={item.category}>
                      <th scope="row">{facets.categories_by_business[group.business].find((category) => category === item.category) ?? item.category}</th>
                      <td>{formatCurrency(item.total_amount)}</td>
                      <td>{formatPercent(group.total > 0 ? item.total_amount / group.total * 100 : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Categorias disponibles: {facets.categories_by_business[group.business].join(", ") || "Ninguna"}
            </p>
          </section>
        ))}
      </div>
      <section aria-labelledby="income-total-title" className="space-y-4">
        <h3 id="income-total-title" className="font-semibold">Ingresos totales por linea de negocio</h3>
        {groups.every((group) => group.total === 0) ? (
          <p role="status" className="py-12 text-center text-muted-foreground">Sin ingresos en el rango seleccionado.</p>
        ) : (
          <div className="h-72 min-w-0" role="img" aria-label={groups.map((group) => `${group.business}: ${formatCurrency(group.total)}`).join("; ")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groups} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="business" stroke="var(--muted-foreground)" />
                <YAxis width={64} stroke="var(--muted-foreground)" tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                <Bar dataKey="total" name="Ingresos" maxBarSize={100} radius={[4, 4, 0, 0]}>
                  {groups.map((group, index) => <Cell key={group.business} fill={index === 0 ? "var(--chart-income)" : "var(--chart-profit)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </section>
  );
}