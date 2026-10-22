# Consulta: del problema al trámite

Un ciudadano cuenta con sus palabras qué le pasa y Brújula le dice qué
trámite es, qué necesita y dónde se hace. Esta suite recorre los cuatro
finales posibles de una consulta con el motor simulado: una clara que lleva a
su ficha, una vaga que pide aclaración (en valenciano y desde el móvil), una
que Brújula no conoce y un fallo del motor.

**Qué no prueba:** si los motores reales (Jev, HelmCode) aciertan, que lo
miden `scripts/probar.ts` y `scripts/evaluar.ts`; ni el contenido de cada
ficha, que sale tal cual de `datos/catalogo-tramites-ayudas.json`.

## Reparto

| Persona | Dispositivo | Cuenta |
|---------|-------------|--------|
| **Ana** | Portátil (`Desktop Chrome`) | Ninguna: Brújula no tiene inicio de sesión |
| **Pau** | Móvil (`Pixel 7`) | Ninguna |

## Preparación

| # | Qué | Comprobación |
|---|-----|--------------|
| S1 | La copia de QA en marcha, con el motor simulado (`npx qa-cockpit up`). | La página de inicio responde y dice «¿Qué trámite necesitas?». |
| S2 | Ana y Pau abren Brújula una vez y se guardan sus sesiones. | Cada uno ve «¿Qué trámite necesitas?». |

## Pruebas

### T1 · Una consulta clara lleva a su ficha

| # | Quién | Hace | Debe ver |
|---|-------|------|----------|
| 1 | Ana | Abre Brújula. | «¿Qué trámite necesitas?» |
| 2 | Ana | Escribe «Quiero votar por correo» en «Cuéntanos qué te pasa» y pulsa «Buscar». | El titular «Solicitar el voto por correo (Elecciones Generales del 29 de noviembre de 2026)». |
| 3 | Ana | Mira «Dónde se hace». | «Correos / Oficina del Censo Electoral (INE)» y el enlace «Hacer el trámite». |

### T2 · En valenciano y desde el móvil, una consulta vaga pide aclaración

| # | Quién | Hace | Debe ver |
|---|-------|------|----------|
| 1 | Pau | Abre Brújula. | «¿Qué trámite necesitas?» |
| 2 | Pau | Pulsa «Valencià». | «Quin tràmit necessites?» |
| 3 | Pau | Pulsa el ejemplo «M'han acomiadat». | «Aclariment 1 de 2» y la pregunta «Què necessites exactament: demanar l'atur, inscriure't com a demandant d'ocupació o ja se t'ha acabat l'atur?» |
| 4 | Pau | Elige «Solicitar la prestación por desempleo (paro)». | Ese titular y la marca «Contingut oficial en castellà». |

### T3 · Lo que Brújula no conoce lleva al Punto de Acceso General

| # | Quién | Hace | Debe ver |
|---|-------|------|----------|
| 1 | Ana | Abre Brújula. | «¿Qué trámite necesitas?» |
| 2 | Ana | Escribe «Quiero adoptar un perro» y pulsa «Buscar». | «No lo encontramos en Brújula» y el enlace «Buscar en administracion.gob.es». |

### T4 · Si el motor falla, la consulta no se pierde

| # | Quién | Hace | Debe ver |
|---|-------|------|----------|
| 1 | Ana | Abre Brújula. | «¿Qué trámite necesitas?» |
| 2 | Ana | Escribe «error de prueba» y pulsa «Buscar». | «No hemos podido consultarlo ahora mismo», su consulta «error de prueba» y el botón «Reintentar». |

## Ejecuciones

| Fecha | Quién | Resultado | Notas |
|-------|-------|-----------|-------|
| 2026-10-22 | agent (Claude Opus 5.5) | green | Primera grabación: T1-T4 en verde contra la copia de QA (next start, motor simulado). |
