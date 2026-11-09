# Especificación de componentes

Este documento describe contratos de presentación. No prescribe componentes React ni una implementación de transporte. Los nombres de campos y parámetros corresponden al OpenAPI disponible en `http://localhost:8000/docs`.

## Funcionalidad 1: Filtro de rango de fechas

**Superficie:** filtro del dashboard principal, compuesto por fecha inicial opcional y fecha final opcional.

**Datos y contratos**

- Referencia de disponibilidad: `GET /api/metrics/facets` → `FacetsResponse`. Mostrar `min_date`–`max_date`, ambos en `YYYY-MM-DD`.
- Las métricas del dashboard usan `GET /api/metrics` con `DateRangeFilter` (`start_date`, `end_date`). El endpoint acepta cualquiera de los dos parámetros de forma independiente.
- Los dos límites son inclusivos: `start_date` selecciona fechas mayores o iguales; `end_date`, menores o iguales.
- Al no especificar ninguna fecha, omitir ambos parámetros para conservar el conjunto completo.

**Contrato de interacción**

- Ambos inputs permiten vaciarse; una fecha vacía se representa omitiendo su parámetro, no enviando una cadena vacía ni `null`.
- Solo fecha inicial: enviar `start_date`; mostrar registros desde ese día hasta la última fecha disponible.
- Solo fecha final: enviar `end_date`; mostrar registros desde la primera fecha disponible hasta ese día.
- Ambas fechas: enviar las dos; mostrar registros dentro del intervalo inclusivo.
- Si la fecha inicial es posterior a la fecha final, mostrar validación junto a los inputs y no aplicar ese rango. La API no documenta una validación de orden para este caso.
- Mostrar el rango disponible obtenido de facets aun cuando el filtro esté vacío. Los valores son límites del conjunto completo; facets no recibe filtros de fecha.

**Props conceptuales**

- `facets: FacetsResponse` para el rango disponible.
- `value: DateRangeFilter` para la selección actual.
- `onChange(value: DateRangeFilter): void` para comunicar cambios válidos.

**Estados condicionales**

- Cargando facets: mostrar estado de carga del rango y mantener el filtro deshabilitado hasta conocer los límites.
- Error de facets: mostrar un estado de error persistente en la zona del filtro; no presentar fechas supuestas.
- Rango inválido: mostrar validación y conservar el último filtro válido aplicado.
- Resultado vacío tras aplicar un rango válido: conservar ambos inputs y el rango disponible; mostrar estado vacío en el dashboard, no retirar el filtro.

## Funcionalidad 2: Tabla de alertas de anomalías

**Endpoint:** `GET /api/metrics/alerts`.

**Parámetros:** `AlertsParams`. La pantalla envía `threshold` (por defecto `0.3`) y puede incluir `start_date` y `end_date`. `group_by` acepta `day`, `week` o `month` y su valor por defecto es `month`. `business_type`, si se usa, acepta `B2B` o `B2C`.

**Columnas**

| Columna visible | Campo API | Presentación |
| --- | --- | --- |
| Período | `period` | Texto según agregación: `YYYY-MM-DD`, `YYYY-Www` o `YYYY-MM`. |
| Outcome registrado | `outcome_total` | Importe monetario del período. |
| Media histórica previa | `baseline_average` | Importe monetario. El contrato API promedia todos los períodos anteriores disponibles en el rango, no solo los tres inmediatamente anteriores. No titular esta columna como promedio móvil de 3 períodos. |
| Incremento porcentual | `increase_ratio` | Multiplicar la razón decimal por 100 para mostrar porcentaje; `0.3` se presenta como `30%`. |

El wording de producto “media móvil de 3 períodos anteriores” no coincide con `baseline_average` en la respuesta viva: la implementación documentada por la API usa el promedio acumulado de períodos previos. La tabla debe expresar ese significado real hasta que el backend exponga una media móvil de tres períodos.

**Configuración del umbral**

- Input numérico con mínimo `0.01`, máximo `1.0`, valor inicial `0.3`; aceptar decimales. El valor es una razón: `0.3` equivale a `30%`.
- La API declara `threshold >= 0`, sin máximo, y default `0.3`. El límite `0.01`–`1.0` es una regla de interfaz solicitada por producto, más restrictiva que OpenAPI.
- La alerta se incluye solo cuando el incremento supera el umbral (`increase_ratio > threshold`); la comparación no es inclusiva.
- La base solo se calcula cuando existe al menos un período anterior y su promedio es mayor que cero. No se genera alerta para un primer período sin histórico.

**Props conceptuales**

- `entries: AlertsResponse` y `params: AlertsParams`.
- `loading: boolean` y `error: string | null` para estados de consulta.
- `onThresholdChange(threshold: number): void` para cambios del input dentro del intervalo permitido por la interfaz.

**Estados condicionales**

- Cargando: mostrar estado de carga en la tabla sin ocultar el control de umbral.
- Error: mostrar mensaje de error en el área de tabla y conservar visible la configuración.
- `entries` vacío (`[]`): mostrar la tabla con sus encabezados y una fila/estado explícito “No se detectaron anomalías para este rango y umbral”; no ocultar la sección.
- Datos: mostrar una fila por cada `AlertEntry`, manteniendo el período retornado por la API.

## Funcionalidad 3: Comparativa de ingresos B2B vs B2C

**Superficie:** nueva página con dos tablas paralelas (B2B y B2C) y un único gráfico que compara el ingreso total de ambos segmentos.

**Endpoints y contratos**

- `GET /api/metrics/facets` → `FacetsResponse`, para mostrar el rango disponible.
- `GET /api/metrics/categories/top` → `TopCategoriesResponse`, con `operation_type=income`, `limit=5` y `business_type=B2B` para la tabla B2B; repetir con `business_type=B2C` para la tabla B2C. Añadir a ambas peticiones el mismo `DateRangeFilter` activo, si existe.
- `GET /api/metrics/summary` → `MetricsSummaryResponse`, con `operation_type=income`, `business_type=B2B` o `B2C`, y el mismo `DateRangeFilter`. Se requiere una consulta por segmento para obtener el denominador de los porcentajes y el total para el gráfico.
- `TopCategoryItem` solo contiene `category`, `operation_type` y `total_amount`; no devuelve porcentaje ni total de grupo. `MetricsSummaryItem` contiene `period`, `income`, `outcome` y `net`.

**Contenido**

- Cada tabla muestra como máximo cinco categorías y las columnas: nombre (`category`), ingresos (`total_amount`) y porcentaje sobre los ingresos totales del segmento.
- Calcular el porcentaje como `total_amount / totalIncomeForSegment * 100`, donde `totalIncomeForSegment` es la suma de `income` de todas las entradas de `MetricsSummaryResponse` de ese segmento. No usar la suma de las filas top-5 como denominador.
- El único gráfico compara los dos totales (`totalIncomeForSegment`) calculados desde summary; no sumar solo las categorías mostradas, porque top-5 podría no incluir todas las categorías.
- Las tablas y el gráfico deben usar el mismo filtro de fechas en las consultas de categorías y summary. El rango de facets es disponibilidad global, no el rango activo.

**Props conceptuales**

- `facets: FacetsResponse` y `dateRange: DateRangeFilter`.
- `b2bCategories: TopCategoriesResponse` y `b2cCategories: TopCategoriesResponse`.
- `b2bSummary: MetricsSummaryResponse` y `b2cSummary: MetricsSummaryResponse`.

**Estados condicionales**

- Mostrar estados de carga y error por separado para cada segmento; el fallo de una consulta no debe presentarse como una lista vacía válida.
- Si una respuesta top está vacía, mantener título y encabezados de esa tabla y mostrar “Sin categorías de ingresos para este segmento y rango”.
- Si summary está vacío, el total del segmento es `0`; mantener el gráfico con ambos segmentos y el valor `0`. En la tabla, si el denominador es cero, mostrar `—` en la columna porcentual para evitar una división indefinida.
- Si un segmento tiene menos de cinco categorías, mostrar solo las filas retornadas; no inventar categorías para completar cinco.