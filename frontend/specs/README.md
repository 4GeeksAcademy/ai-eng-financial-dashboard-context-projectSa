# Contrato de datos para funcionalidades frontend

Este directorio especifica tipos y comportamiento visible; no implementa componentes, transporte HTTP ni cambios de backend. El contrato se contrastó con el OpenAPI y las respuestas vivas de `http://localhost:8000/docs` (`/openapi.json`).

El frontend existente obtiene `GET /api/metrics` desde [App.tsx](../src/App.tsx) y tipa los movimientos mediante [financial-types.ts](../src/lib/financial-types.ts). Los nuevos contratos siguen ese uso de `fetch` y los nombres snake_case de la API, pero no especifican lógica de petición.

## Funcionalidad 1: Filtro de rango de fechas

### Endpoints

| Endpoint | Uso | Parámetros | Respuesta |
| --- | --- | --- | --- |
| `GET /api/metrics/facets` | Límites globales de disponibilidad y valores de filtros. No acepta query params. | Ninguno. | `FacetsResponse` |
| `GET /api/metrics` | Movimientos del dashboard filtrados por fecha. | `DateRangeFilter`; también existen `category` y `operation_type`, fuera del alcance de este filtro. | `FinancialMovement[]`, tipo existente en `frontend/src/lib/financial-types.ts` |

### Tipos y reglas

- `FacetsResponse.min_date` y `max_date` son fechas ISO `YYYY-MM-DD`; indican la fecha mínima y máxima presentes en el conjunto global.
- `DateRangeFilter.start_date` y `end_date` son opcionales, con formato ISO `YYYY-MM-DD`, iguales a los parámetros query de la API. Sus límites son inclusivos.
- Omitir ambos parámetros consulta el período completo. Enviar solo `start_date` filtra desde esa fecha en adelante; enviar solo `end_date` filtra hasta esa fecha. Con ambos, se filtra dentro del intervalo inclusivo.
- `GET /api/metrics/facets` no recibe el rango seleccionado: sus límites no cambian al filtrar el dashboard.
- La API valida cada valor como fecha, pero no declara una regla de orden para `start_date` y `end_date`. La UI valida que la fecha inicial no sea posterior a la final antes de aplicar el filtro.

### Casos límite

1. Solo se informa `start_date`: la UI mantiene vacío el input final y muestra movimientos cuya fecha sea igual o posterior al inicio, hasta el final de los datos disponibles.
2. Solo se informa `end_date`: la UI mantiene vacío el input inicial y muestra movimientos desde el comienzo de los datos hasta el final inclusivo.
3. `start_date` es posterior a `end_date`: la UI muestra validación junto a los inputs, conserva el último rango válido y no presenta el resultado como una búsqueda vacía de la API.
4. Un intervalo válido no contiene movimientos: la UI conserva los inputs y los límites globales de facets, y muestra un estado vacío en el dashboard.

## Funcionalidad 2: Alertas de anomalías

### Endpoint

`GET /api/metrics/alerts` devuelve `AlertsResponse` (`AlertEntry[]`). Parámetros aceptados:

| Parámetro | Tipo y valores válidos | Default OpenAPI | Regla de producto/UI |
| --- | --- | --- | --- |
| `threshold` | Número, mínimo API `0`; API no define máximo. | `0.3` | Input numérico limitado a `0.01`–`1.0`, default `0.3`. Es razón decimal: `0.3` representa 30%. |
| `group_by` | `day`, `week` o `month`. | `month` | El formato de `period` depende de esta opción. |
| `start_date` | Fecha `YYYY-MM-DD`, inclusiva. | Omitido | Sin límite inferior cuando se omite. |
| `end_date` | Fecha `YYYY-MM-DD`, inclusiva. | Omitido | Sin límite superior cuando se omite. |
| `business_type` | `B2B` o `B2C`. | Omitido | Sin segmentación cuando se omite. |

Los tipos son `AlertsParams` y `AlertsResponse` en `param-types.ts` y `api-types.ts`. Cada alerta contiene exactamente `period`, `outcome_total`, `baseline_average` e `increase_ratio`. `period` usa `YYYY-MM-DD` para day, `YYYY-Www` para week o `YYYY-MM` para month. `increase_ratio` es una razón decimal redondeada a 4 decimales; multiplicarla por 100 produce el porcentaje visible.

### Desajuste de definición

El requerimiento menciona una media móvil de los tres períodos previos. El OpenAPI solo devuelve `baseline_average`, y el comportamiento vivo calcula la media de todos los períodos anteriores disponibles dentro del rango agregado. No se debe presentar ese campo como “media móvil de 3 períodos”. La API crea una alerta únicamente cuando `increase_ratio > threshold`; se omite el primer período, sin histórico previo, y no se calcula alerta si la media base no es mayor que cero.

### Casos límite

1. Respuesta `[]`: mantener encabezados y control de umbral; mostrar “No se detectaron anomalías para este rango y umbral”. La sección no desaparece.
2. El incremento es exactamente igual al umbral: no mostrar una alerta, porque el criterio API es estrictamente mayor (`>`).
3. El rango empieza en el primer período disponible y no hay observaciones previas dentro del rango: no hay baseline para ese período; no inventar una media ni una alerta.
4. El input queda vacío o fuera de `0.01`–`1.0`: mostrar validación y no aplicar un valor fuera del rango de producto, aunque la API acepte `0` y valores mayores que `1`.

## Funcionalidad 3: Comparativa de ingresos B2B vs B2C

### Endpoints

| Endpoint | Uso | Parámetros de la funcionalidad | Respuesta |
| --- | --- | --- | --- |
| `GET /api/metrics/facets` | Mostrar rango global disponible. | Ninguno. | `FacetsResponse` |
| `GET /api/metrics/categories/top` | Categorías con mayores ingresos para cada segmento. Llamar una vez por segmento. | `operation_type=income`, `limit=5`, `business_type=B2B` o `B2C`, más fechas opcionales. | `TopCategoriesResponse` (`CategoryEntry[]`) |
| `GET /api/metrics/summary` | Total de ingresos de cada segmento para el denominador y el gráfico. Llamar una vez por segmento. | `operation_type=income`, `business_type=B2B` o `B2C`, `group_by` opcional y las mismas fechas. | `MetricsSummaryResponse` (`MetricsSummaryEntry[]`) |

El endpoint top acepta además los parámetros API `start_date`, `end_date`; `operation_type` (`income` o `outcome`, default `outcome`); `limit` entero de `1` a `20` (default `5`); y `business_type` (`B2B` o `B2C`). Para la vista, ambas tablas especifican `income` y `5` explícitamente. El contrato TypeScript es `TopCategoriesParams`.

Summary acepta `group_by` (`day`, `week`, `month`; default `month`), `start_date`, `end_date`, `category`, `operation_type` (`income`, `outcome`) y `business_type` (`B2B`, `B2C`). El tipo de parámetros usado por esta funcionalidad es `MetricsSummaryParams`; su respuesta se modela como `MetricsSummaryResponse`.

### Derivaciones y discrepancias

- `CategoryEntry` solo contiene `category`, `operation_type` y `total_amount`; no hay campo de porcentaje ni de total del segmento. El porcentaje de fila se deriva como `total_amount / totalIncomeForSegment * 100`.
- Calcular `totalIncomeForSegment` sumando `income` de todas las entradas de `MetricsSummaryResponse` para el segmento. Ese total alimenta el único gráfico con dos valores, B2B y B2C. No derivarlo sumando solo las filas top-5.
- El requerimiento enumera categories/top y facets, pero esas respuestas no bastan para obtener el ingreso global ni el denominador. `/api/metrics/summary` es un endpoint existente, verificado en OpenAPI, y necesario para satisfacer fielmente el gráfico y los porcentajes.
- Aplicar el mismo `DateRangeFilter` a categories/top y summary para ambos segmentos. El rango de facets es global y solo se usa como referencia de disponibilidad.
- Los números son valores numéricos de ingreso; la API no especifica código de moneda ni formato localizado. La UI no debe inferirlos de este contrato.

### Casos límite

1. Top categories devuelve `[]`: mantener el título y encabezados de la tabla del segmento y mostrar “Sin categorías de ingresos para este segmento y rango”.
2. Top categories devuelve menos de cinco categorías: mostrar exactamente las filas recibidas, sin placeholders inventados.
3. Summary está vacío: total del segmento igual a `0`; mantener el gráfico comparativo con ambos segmentos y mostrar `0` para el segmento vacío. Si el denominador es cero, mostrar `—` en porcentajes en vez de calcular una división indefinida.
4. Solo uno de los segmentos tiene ingresos: la tabla y el valor de ese segmento se muestran normalmente; el otro conserva su estado sin categorías/total cero, y el único gráfico conserva ambos grupos para hacer visible la comparación.

## Archivos de tipos

- `api-types.ts`: `FacetsResponse`, `AlertEntry`, `AlertsResponse`, `CategoryEntry`, `TopCategoriesResponse`, `MetricsSummaryEntry` y `MetricsSummaryResponse`, además de los unions API `OperationType`, `BusinessType`, `Category` y `GroupBy`.
- `param-types.ts`: `DateRangeFilter`, `AlertsParams`, `TopCategoriesParams` y `MetricsSummaryParams`.
- Las propiedades de respuesta mantienen los nombres snake_case reales de OpenAPI. Los tipos `string` de fecha documentan `YYYY-MM-DD`; esta capa no añade validación runtime.