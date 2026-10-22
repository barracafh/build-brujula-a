# Brújula · Especificación (The Shakers, brujula-a)

Estado: borrador v1 · 22/10/2026

## 1. Qué es

Una persona escribe su problema con sus palabras, en castellano o en valenciano. Brújula identifica el trámite o la ayuda del catálogo y muestra los pasos, la documentación, el plazo, el enlace directo a la sede y las fuentes. Después propone el siguiente trámite («Y después, ¿qué?»).

Prioridades, en este orden:
1. **Recuperar el trámite correcto**, o decir honestamente que no está.
2. **Rapidez**: la respuesta normal debe llegar en menos de 1 s.
3. **No inventar nada**: el contenido sale tal cual del catálogo.

## 2. Principio de diseño

- **La IA solo decide qué trámite es.** Nunca redacta pasos, plazos, requisitos ni enlaces.
- Todo lo que se muestra sale de `datos/catalogo-tramites-ayudas.json` (21 entradas).
- La respuesta solo lleva textos fijos de la interfaz, en ES o VA.

## 3. Flujo

```
frase del usuario
   │
   ▼
[1] Jev: UNA llamada con dos preguntas en paralelo (~0,3 s)
     · tramite → choice entre los 21 ids
     · encaja  → noul: «¿corresponde a alguno de estos trámites?»
     · idioma  → choice: es | va
   │
   ├─ error / sin clave / timeout (>3 s) ──► [2] Fallback LLM
   │
   ▼
[3] Decisión (en código)
     encaja < 0,40                      → FUERA DE CATÁLOGO
     confianza ≥ 0,85                   → RESPUESTA
     0,40 ≤ confianza < 0,85            → DESAMBIGUAR (top 2–3)
     confianza < 0,40 y encaja ≥ 0,40   → [2] Fallback LLM
```

**Umbrales provisionales.** Salen de la prueba del 22/10 (apartado 9) y se ajustan con el set de pruebas.

### [2] Fallback LLM
- Usa HelmCode, compatible con OpenAI, mediante `completar()` de `src/lib/ia.ts` y el modelo de `HELMCODE_MODEL`.
  - En local: `deepseek-v4-flash`, unos 2 s.
  - Publicado: el modelo que haya configurado la organización.
- Prompt: el catálogo resumido (id, título y frases de ejemplo) y la frase del usuario. Devuelve JSON con `response_format: json_object` y la palabra «JSON» en el prompt:
  `{"id": "<id del catálogo>" | null, "alternativas": ["<id>", ...]}`
- **Se valida en código** que cada id existe. Un id que no existe se trata como `null`.
- `id` válido → RESPUESTA. `null` → FUERA DE CATÁLOGO. Solo `alternativas` → DESAMBIGUAR.
- Si el LLM también falla: se busca por palabras en `frases_usuario` y, si no hay coincidencia, FUERA DE CATÁLOGO.

### Casos de salida
| Caso | Qué ve el usuario |
|---|---|
| RESPUESTA | Ficha completa del trámite (apartado 5) y «Y después, ¿qué?» |
| DESAMBIGUAR | «¿Te refieres a…?» con 2–3 botones, uno por trámite. Al pulsar, se muestra la ficha sin volver a llamar a la IA |
| FUERA DE CATÁLOGO | «No tenemos este trámite en Brújula.» y un enlace al [buscador del PAG](https://administracion.gob.es/tramites-electronicos/resultados-actuaciones), sin inventar nada |

## 4. Situaciones con varios trámites

Se devuelve **un trámite principal**. Los demás aparecen en «Y después, ¿qué?» a partir del campo `relacionados`. Si Jev duda entre varios, por ejemplo «no llego a fin de mes y tengo dos críos» (CAPI 0,67 / IMV 0,32), se resuelve como DESAMBIGUAR.

## 5. Ficha de respuesta (campo del JSON → componente)

| Bloque de la UI | Campo |
|---|---|
| Titular | `titulo` |
| Organismo | `organismo`, `administracion` |
| Pasos numerados | `pasos` |
| Tarjeta Requisitos | `requisitos_clave` |
| Tarjeta Documentación | `documentacion` |
| Tarjeta Plazo (la amarilla, solo una) | `plazo` |
| Nota | `nota`, si existe |
| «Dónde se hace»: botón principal (`sunset`) | `enlace_tramite`, o `enlace_info` si no hay |
| Más información | `enlace_info` |
| `<Fuentes />` | `fuente`, separada por `;` |
| Aviso | si `verificado === false`: «Información sin verificar: compruébala en la sede oficial» |

## 6. «Y después, ¿qué?»

- Debajo de la ficha, una tarjeta por cada id de `relacionados`, con título, tipo (trámite o ayuda), organismo y la marca de «sin verificar» si toca.
- Al pulsar una tarjeta se muestra su ficha. Es instantáneo, porque no llama a la IA.
- Las entradas sin `enlace_tramite`, como `renta-valenciana-inclusion`, lo dicen y remiten a servicios sociales o al 012, tal como pide `SETUP.md`.

## 7. Idioma (ES / VA)

- Jev detecta el idioma en la misma llamada (pregunta `idioma`).
- **Textos de la interfaz**: diccionario fijo ES/VA en `src/i18n.ts` (titulares de bloque, botones, avisos, mensaje de fuera de catálogo).
- **Contenido del trámite**: en castellano tal cual, con la nota «La información oficial está en castellano». No se traduce con IA, para no inventar.
- Mejora opcional, fuera de la v1: traducir con IA, siempre marcado como traducción automática.

## 8. Interfaz

- Una sola pantalla:
  - Titular.
  - Una `Textarea` con el botón «Buscar» (`sunset`).
  - 5–6 **botones de ejemplo**: «Me han echado del trabajo», «M'han acomiadat», «Quiero votar por correo el 29-N», «Me he mudado a València», «Me han puesto una multa», «No llego a fin de mes».
  - El resultado debajo.
- Se respeta el sistema Sol (`AGENTS.md` → Diseño). Se mantienen el aviso de no oficial y `<BotonAviso />`.
- Una llamada por envío; nunca una llamada por cada tecla.

## 9. Arquitectura

```
src/
  app/page.tsx                 UI (cliente)
  app/api/brujula/route.ts     POST {frase} → {caso, id?, opciones?, idioma, motor}
  lib/catalogo.ts              carga el JSON, getById, resumen para prompts
  lib/jev.ts                   llamada HTTP a TypeSafe (sin SDK)
  lib/clasificar.ts            decisión Jev → umbrales → fallback LLM → palabras clave
  lib/ia.ts                    (existe) HelmCode
  i18n.ts                      textos ES/VA
```
- **Variables**: `JEV_API_KEY`, `HELMCODE_API_KEY`, `HELMCODE_MODEL`. Todas solo en el servidor, ninguna con el prefijo `NEXT_PUBLIC_`.
- **Sin `JEV_API_KEY`**: se pasa directamente al fallback LLM. Así la web publicada funciona aunque la organización no añada la clave.
- **Jev**:
  - Llamada: `POST https://api.typesafe.ai/v1/systemone`, cabecera `Authorization: Bearer`, modelo `jev-latest`, timeout de 3 s.
  - Errores 429 y 529: un único reintento.
  - En `criteria`, cada id lleva su descripción: `titulo (organismo). Ejemplos: frases_usuario`.
- **La respuesta de la API incluye `motor` (jev | llm | palabras)** para enseñarlo en la demo.

**Prueba inicial de Jev, 22/10** (catálogo completo, unos 0,25–0,4 s por llamada):
| Frase | Top | Confianza | Encaja |
|---|---|---|---|
| me han echado del trabajo | prestacion-desempleo | 1,00 | 0,90 |
| m'han acomiadat | prestacion-desempleo | 0,99 | 0,84 |
| quiero votar por correo el 29N | voto-por-correo | 1,00 | 0,98 |
| me he mudado de piso y tengo coche | cambio-domicilio-dgt | 0,95 | 0,85 |
| no llego a fin de mes y tengo dos críos | CAPI 0,67 / IMV 0,32 | 0,65 | 0,80 |
| necesito el pasaporte | renovacion-dni ❌ | 0,81 | **0,16** |
| quiero casarme | certificado-empadronamiento ❌ | 0,59 | **0,02** |
| hola | — | 0,15 | 0,02 |

Conclusión: **la confianza sola no basta.** El pasaporte salía como DNI con 0,81. La pregunta `encaja` es la que detecta lo que está fuera del catálogo.

## 10. Reglas de la plataforma (obligatorias)

1. `<Fuentes />` en cada respuesta, con la página concreta.
2. Sin datos personales reales.
3. **No se guarda ni se registra en logs la frase del usuario**: ni `console.log` del texto ni base de datos.
4. Ante la duda, se dice y se enlaza la sede oficial.
5. Se mantienen el aviso «Herramienta experimental. No es un servicio oficial.» y el botón de aviso.
6. `ficha.json` debe estar actualizada.
7. No se editan `datos/`, `comun/`, `contexto.md` ni `SETUP.md`.

## 11. Pruebas

Set de frases en `src/datos/pruebas.json`: frase, id esperado o `null`, idioma. Incluye:
- frases de `frases_usuario`;
- paráfrasis;
- frases en valenciano;
- frases con faltas de ortografía;
- casos de varios trámites;
- frases fuera de catálogo (pasaporte, boda, NIE…).

Un script lo ejecuta y da el porcentaje de aciertos y la latencia, para ajustar los umbrales.

**Demo obligatoria**:
- «me han echado del trabajo» → prestación por desempleo completa.
- Voto por correo → entrada `voto-por-correo`, con los enlaces a Correos y al INE.

## 12. Pendiente / riesgos

- [ ] Pedir a la organización que añada `JEV_API_KEY` en Vercel. Si no lo hace, la versión publicada funciona solo con el LLM.
- [ ] Ajustar los umbrales con el set de pruebas.
- [ ] README: media página con problema, usuario, qué hemos hecho y qué falta para producción. Incluir que el texto se envía a TypeSafe (EE. UU.) y a HelmCode, lo que exige RGPD y un contrato de encargado (`contexto.md` §7).
- [ ] `buildnight revisar` en verde antes de `buildnight registrar`.

## 13. Fuera de alcance (v1)

- Entrada por voz.
- Varios trámites principales a la vez.
- Ampliar el catálogo.
- Traducir el contenido con IA.
