# Formato `Métricas JSON` v2 — BD Informes financieros

Contrato entre el dashboard (`ecom-dashboard`, productor) y el portal de cliente
(`portal-ecomsolutions`, consumidor). Cualquier cambio debe aplicarse en los dos
repositorios a la vez.

Fuente de verdad de los tipos: `lib/quantum/tipos.ts` en `ecom-dashboard`.

## Dónde vive cada cosa

| Propiedad Notion | Contenido |
|---|---|
| `Métricas JSON` | El objeto v2 descrito aquí (sin cuentas de detalle) |
| `PyG JSON` | Array de cuentas de detalle de la PyG |
| `Balance JSON` | Array de cuentas de detalle del balance |
| `Base PyG` | `Acumulado YTD` — espejo legible de `basePyg` |
| `Tipo período` | `Mensual` / `Trimestral` / `Anual` — espejo de `periodo.tipo` |

Las cuentas de detalle van aparte porque `Métricas JSON` se trocea en bloques de
2.000 caracteres y Notion admite como mucho 100 por propiedad (200 KB); meterlo
todo junto provocaría truncamiento silencioso.

## Origen de los datos

Los informes salen de exports `.xlsx` de Quantum. Estructura relevante:

```
 4 | "Empresa:"   | "35031  GRUPO AIRWAY S.L"
 6 | "Periodo:"   | "APERTURA   hasta  JULIO 2026"
 8 | ...          |             |             |        | "2026" | "2025" | "%"
 9 | "A01 "       | "IMPORTE CIFRA DE NEGOCIOS" |      |  975   |  385   | 153.25
10 |              |             | "700000000" | "VENTAS DE MERCADERIAS" | 250 | · | ·
```

- Columna **E** = ejercicio actual. Columna **F** = mismo período del ejercicio
  anterior. El año de cada una se lee de la fila de cabecera (E8/F8), no se asume.
- **La PyG es acumulada desde enero (YTD).** La cifra del mes se deriva restando
  el YTD del período anterior. El balance no acumula: es un saldo a fecha.
- Una celda vacía significa 0 con la fila presente (`found: true`). Que la fila no
  exista es distinto (`found: false`).

## Estructura

```jsonc
{
  "version": 2,
  "generadoEn": "2026-09-16T18:22:05.123Z",
  "tipoCliente": "sociedad",          // "sociedad" | "autonomo"
  "basePyg": "ytd",
  "moneda": "EUR",

  "cliente": {
    "codigoQuantum": "35031",
    "nombreExcel": "GRUPO AIRWAY S.L"
  },

  "periodo": {
    "etiqueta": "Julio 2026",         // === propiedad "Período"
    "tipo": "Mensual",                // === propiedad "Tipo período"
    "ejercicio": 2026,                // de E8
    "ejercicioAnterior": 2025,        // de F8
    "mes": 7,                         // mes de cierre 1-12; null si tipo === "Anual"
    "origen": "APERTURA   hasta  JULIO 2026"
  },

  "balance": { /* ... */ },           // null para autónomo
  "pygYtd":  { /* ... */ },
  "pygMes":  { /* ... */ },           // null si tipo === "Anual"
  "avisos":  [ /* ... */ ]
}
```

### Métrica

Toda cifra usa la misma forma:

```jsonc
{
  "actual": 975,          // columna E
  "anioAnterior": 385,    // columna F; null si el export no trae ejercicio anterior
  "varPct": 153.25,       // ver reglas abajo
  "found": true,          // la fila existe en el Excel
  "derivado": false       // true si no se lee del Excel sino que se calcula
}
```

Reglas de `varPct`:

- Se calcula aquí como `(actual - anioAnterior) / anioAnterior * 100`, redondeado
  a 2 decimales.
- Es **`null`** cuando `anioAnterior` es `null`, `0` o **negativo**. Un porcentaje
  sobre base negativa no significa nada.
- La columna `%` de Quantum se descarta precisamente por eso: la calcula igual
  sobre bases negativas (da `-125,98 %` sobre un resultado anterior de `-632,54`).
  Donde la base es positiva, nuestro cálculo coincide con el suyo al céntimo.

**Todos los importes van redondeados a 2 decimales. Los gastos son siempre
positivos**, aunque Quantum los exporte en negativo.

### `balance` (solo sociedad; `null` en autónomo)

```jsonc
{
  "totalActivo":      { "actual": 1349.98, "anioAnterior": 4242.42, "varPct": -68.18, "found": true },
  "caja":             { "actual": 0,       "anioAnterior": 1417.15, "varPct": -100,   "found": true },
  "clientesDeudores": { "actual": 1179.75, "anioAnterior": 623.15,  "varPct": 89.32,  "found": true },
  "patrimonioNeto":   { "actual": 164.31,  "anioAnterior": 1854.90, "varPct": -91.14, "found": true },
  "pasivoCorriente":  { "actual": 1185.67, "anioAnterior": 2387.52, "varPct": -50.34, "found": true },
  "proveedores":      { "actual": 940.78,  "anioAnterior": 4672.29, "varPct": -79.86, "found": true },
  "cuadre": { "totalActivo": 1349.98, "totalPasivo": 1349.98, "diferencia": 0, "ok": true }
}
```

Epígrafes de origen: `TOTAL ACTIVO (A + B)`, `EFECTIVO Y OTROS ACTIVOS LIQ.`,
`CLIENTES POR VENTAS Y PRES.SER`, `FONDOS PROPIOS`, `PASIVO CORRIENTE`,
`PROVEEDORES`, `TOTAL PATRIMONIO NETO Y PASIVO`.

### `pygYtd` — sociedad

```jsonc
{
  "ingresos":                 { "actual": 975,    "anioAnterior": 385,     "varPct": 153.25, "found": true },
  "otrosIngresosExplotacion": { "actual": 0,      "anioAnterior": 0,       "varPct": null,   "found": false },
  "gastos":                   { "actual": 810.69, "anioAnterior": 1017.54, "varPct": -20.33, "found": true, "derivado": true },
  "resultadoExplotacion":     { "actual": 164.31, "anioAnterior": -632.54, "varPct": null,   "found": true },
  "resultado":                { "actual": 164.31, "anioAnterior": -632.54, "varPct": null,   "found": true }
}
```

- `ingresos` = epígrafe `A01 IMPORTE CIFRA DE NEGOCIOS`.
- `otrosIngresosExplotacion` = suma de epígrafes `A##` **positivos** distintos de
  A01 (p. ej. `A05`). `found: false` cuando no hay ninguno.
- `gastos` = suma en positivo de los epígrafes `A##` **negativos** (A04, A06, A07,
  A08...). No se calcula como `ingresos - resultado de explotación`, porque esa
  resta mezclaría los otros ingresos de explotación dentro de los gastos.
- `resultadoExplotacion` = `RESULTADO EXPLOTACION`; `resultado` = `RESULTADO DEL
  EJERCICIO`.

Invariante comprobado al parsear: `suma(epígrafes A##) === resultadoExplotacion`.
Si falla, se emite un aviso (no bloquea).

### `pygYtd` — autónomo

```jsonc
{
  "ingresos":  { "actual": 28830,    "anioAnterior": null, "varPct": null, "found": true },
  "gastos":    { "actual": 22617.12, "anioAnterior": null, "varPct": null, "found": true },
  "resultado": { "actual": 6212.88,  "anioAnterior": null, "varPct": null, "found": true }
}
```

De `TOTAL INGRESOS`, `TOTAL GASTOS` y `RENDIMIENTO NETO ESTIMADO`. **No hay
`resultadoExplotacion` ni `otrosIngresosExplotacion`.** El invariante de suma de
epígrafes no aplica: en el export de autónomo `A03` es un subtotal, no un
componente.

> **Discrimina siempre por `tipoCliente`, nunca por la presencia de claves.**

### `pygMes`

Mismas claves que `pygYtd`, con las cifras del período aislado.

```jsonc
{
  "disponible": true,
  "motivo": null,                  // "sin-informe-anterior" | "enero" | "periodo-anual"
  "baseAnterior": { "periodo": "Junio 2026", "informeId": "<notion page id>" },

  "ingresos":             { "actual": 100,   "anioAnterior": 85, "varPct": 17.65, "found": true, "derivado": true },
  "gastos":               { "actual": 22.54, "anioAnterior": 0,  "varPct": null,  "found": true, "derivado": true },
  "resultadoExplotacion": { "actual": 77.46, "anioAnterior": 85, "varPct": -8.87, "found": true, "derivado": true },
  "resultado":            { "actual": 77.46, "anioAnterior": 85, "varPct": -8.87, "found": true, "derivado": true }
}
```

Cálculo, con `E`/`F` las columnas del Excel:

```
mes(actual)       = E(este período) - E(período anterior)
mes(añoAnterior)  = F(este período) - F(período anterior)
```

La cifra del mismo mes del año anterior sale de la **columna F de esos dos mismos
informes**: no hace falta tener cargados los informes del ejercicio anterior.

Casos sin derivación:

| Situación | `disponible` | `motivo` | Contenido |
|---|---|---|---|
| Enero | `true` | `"enero"` | Igual que `pygYtd` (el acumulado *es* el mes) |
| Falta el informe del período anterior | `false` | `"sin-informe-anterior"` | Métricas a `null` |
| `periodo.tipo === "Anual"` | — | — | `pygMes` es `null` |

Cuando `disponible` es `false`, **el portal debe mostrar solo el acumulado** y
decir explícitamente que no hay dato del período aislado.

### `avisos`

```jsonc
[ { "nivel": "aviso", "codigo": "sin-ejercicio-anterior",
    "mensaje": "El export no trae columna del ejercicio anterior." } ]
```

`nivel` es `"error"` o `"aviso"`. Un informe publicado nunca contiene `error`
(los errores bloquean la publicación), pero sí puede contener avisos que conviene
mostrar al gestor. Códigos actuales: `sin-ejercicio-anterior`,
`descuadre-epigrafes`, `empresa-no-coincide`, `tipo-cliente-no-coincide`,
`sin-informe-anterior`.

## Cuentas de detalle — `PyG JSON` y `Balance JSON`

```jsonc
[
  { "epigrafe": "A01", "epigrafeDesc": "IMPORTE CIFRA DE NEGOCIOS",
    "cuenta": "700000000", "desc": "VENTAS DE MERCADERIAS",
    "actual": 250, "anioAnterior": 0 }
]
```

`epigrafe`/`epigrafeDesc` es el epígrafe del que cuelga la cuenta, para poder
agrupar y generar alertas por partida. Son cifras **acumuladas (YTD)**, igual que
`pygYtd`.

## Cambios respecto a v1

| v1 | v2 |
|---|---|
| `{ actual, anterior, porcentaje }` | `{ actual, anioAnterior, varPct, found }` |
| `deudasCP` | `pasivoCorriente` |
| `gastosPersonal`, `otrosGastos` | `gastos` (agregado); desglose en `PyG JSON` |
| `Balance JSON`/`PyG JSON` = 200 filas en crudo | Array de cuentas de detalle |
| Sin `tipoCliente` | `tipoCliente` obligatorio |
| Cifras de PyG = acumulado presentado como si fuera del período | `pygYtd` + `pygMes` separados |

Un consumidor debe comprobar `version` y rechazar lo que no entienda. Los informes
v1 existentes no se migran: se regeneran volviendo a subir el Excel.
