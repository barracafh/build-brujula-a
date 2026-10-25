> **Build night BARRACA x SOTI** · 22 de octubre de 2026, Flywire, València.
>
> **Brújula · Asistente de trámites**, de The Shakers (track Brújula). Encuentra el trámite y el siguiente paso. Publicada en https://build.barraca.house/punto-atencion-ciudadana/brujula-a; la IA funciona hasta el 30 de noviembre de 2026.
>
> Repo archivado: es el código tal como quedó tras la noche. Si quieres seguir con él, haz un fork. El CLI del evento y su registro ya no existen, así que las instrucciones de `buildnight` que haya más abajo ya no sirven.

# Brújula · Procedure assistant

**Describe your situation in your own words and Brújula tells you which official procedure or benefit you need, the steps, the documents, the deadline, and the direct link to the official website.**

Live demo: <https://build.barraca.house/punto-atencion-ciudadana/brujula-a> (the interface is in Spanish and Valencian).

Brújula ("compass" in Spanish) is an experimental tool for residents of the Comunitat Valenciana (Spain). It is not an official service.

## The problem

Public administrations name things in their own language: "prestación contributiva por desempleo", "alta en el padrón", "Renta Valenciana de Inclusión". People describe their problem differently: "they fired me", "I just moved", "I can't make ends meet". To find the right procedure you first need to know its official name, and most people don't.

Brújula bridges that gap. The citizen writes (or dictates) the situation in Spanish or Valencian. Brújula identifies the procedure and shows the official information, always with a link to the source.

## What it does

| You write | Brújula answers |
|---|---|
| "Me han echado del trabajo" | Unemployment benefit: steps, documents, deadline (15 days), link to the SEPE website. Then "And after that, what?": register with Labora, unemployment subsidy, and so on. |
| "Me acabo de mudar a València" | Registering at the municipal register (padrón), with the steps and the city council link. |
| "No llego a fin de mes y tengo dos críos" | Two or three candidates (child support supplement, minimum income) and the question "Do you mean…?" so you pick one. |
| Something not in the catalogue | "We couldn't find it in Brújula", and a link to the official search engine of the Spanish government (administracion.gob.es). It never makes anything up. |

Features:

- **Free text in Spanish or Valencian**, typed or dictated by voice.
- **Complete answer card**: numbered steps, requirements, documents, deadline (the key figure), where to do it (button to the official site) and a list of official sources.
- **"And after that, what?"**: related procedures and benefits that usually come next, each with its link.
- **Follow-up chat** on an open procedure: you can ask about that procedure and the assistant answers only from its data. If you ask about another procedure, it searches the catalogue.
- **Listen button**: pre-recorded audio of the answer, in Spanish and Valencian.
- **Calendar links**: fixed deadlines can be added to Google Calendar.
- **Recent procedures**: the last five procedures you opened are kept in your own browser only.
- **Warnings**: entries not yet checked against the official site show a "not verified" notice.

## How it works

```
citizen's sentence
      │  (personal data such as ID numbers, emails and phones is stripped first)
      ▼
 server route /api/consulta
      │
      ▼
 1. Jev (TypeSafe)  ── one call, three questions: which procedure? does it fit the
      │                  catalogue? which language? Thresholds in code decide.
      │  unavailable or unsure
      ▼
 2. HelmCode LLM    ── picks an id from the catalogue (the id is validated in code)
      │  unavailable
      ▼
 3. Keyword match   ── last resort
      │
      ▼
 outcome: direct answer │ "Do you mean…?" (2–3 candidates) │ not in the catalogue
```

The central design rule: **the AI only decides which procedure it is. It never writes steps, deadlines, requirements or links.** Everything shown comes verbatim from the catalogue, each entry with its official source. The AI texts are limited to short clarification questions, and the follow-up chat is only allowed to quote figures and links that appear in the catalogue data.

Other pieces:

- **Catalogue**: 37 entries. 21 were provided by the organisers (13 procedures and 8 benefits, in `datos/catalogo-tramites-ayudas.json`) and 16 are procedures of the Ajuntament de València (`src/datos/catalogo-valencia.json`).
- **Semantic search**: the catalogue is embedded once (`src/datos/vectores.json`, model `qwen3-embedding`, 1,536 dimensions). At query time the sentence is embedded and compared in memory with cosine similarity. No database.
- **Voice**: dictation uses ElevenLabs Scribe (`src/app/api/voz/route.ts`). Without a key, the button does not appear.
- **Audio**: answers are pre-generated as MP3 files (`public/audio/`, script `scripts/pregenerar-audio.ts`). Nothing plays on its own.
- **Interface**: Spanish and Valencian. The official content stays in Spanish, as published by the administrations.

## Rules the tool follows

1. Every answer cites its official source and links the specific page that supports it.
2. No real personal data: no ID numbers, case files or passwords. The tool asks users not to type any, and masks ID numbers, emails and phone numbers in the text before sending it to any AI service (names and addresses are not detected, so this is not a guarantee).
3. **Nothing the citizen writes is stored**: no database and no logs with their text. The only thing kept is the list of recently opened procedures, in the browser's own storage, never sent to the server.
4. When in doubt, the tool says it cannot confirm and links the official site. It never invents amounts, deadlines or requirements.
5. A first-use notice explains which third parties receive the text (Jev/TypeSafe, HelmCode and, for dictation, ElevenLabs). The "Experimental tool, not an official service" notice and the "Something wrong? Let us know" button are always present.

## Context

Brújula was built at **Build night · BARRACA x SOTI** (22 October 2026, València), a one-night event where teams build public-service tools for citizens on a shared platform. Each team gets a track with a challenge; this one is "What procedure do I need?" plus "And after that, what?". Every tool on the platform uses the same visual system, **Sol** (by [Reforma Digital](https://github.com/samuelcorsan/reforma-digital), MIT license, see [AVISO.md](AVISO.md)).

Terms used in the code and docs (full list in [GLOSSARY.md](GLOSSARY.md)): *trámite* is a procedure the citizen must do; *ayuda* is a benefit they can apply for; *entrada* is one catalogue item; *PAG* is the Punto de Acceso General, the Spanish government's procedure search portal.

## What is missing for production

- GDPR review and data processing agreements with TypeSafe (US) and HelmCode.
- Tuning the confidence thresholds with real citizen sentences (`src/lib/clasificar.ts`).
- The new procedure link for the Renta Valenciana de Inclusión, which changed law on 20 October 2026. Its entry is marked as not verified.
- Reviewed Valencian translation of the catalogue content.
- Usage metrics that do not store what the user writes.

## Tech stack

Next.js (App Router) and Tailwind CSS 4, shadcn/ui on Base UI, TypeScript, Bun. Deployed on Vercel.

```
src/app/            page and API routes (/api/consulta, /api/entradas/[id], /api/voz, /api/ia, /api/brujula)
src/components/     interface: flujo/ (search and conversation), respuesta/ (answer card, Listen), ui/ (Sol primitives)
src/lib/            classification, search, minimisation of personal data, Jev and HelmCode clients, motor/ (engines and chat agent)
src/datos/          our data: Valencia catalogue, vectors, audio manifest, test sets
src/styles/         Sol design tokens (do not edit values)
public/audio/       pre-generated answer audio
scripts/            tests and evaluations, audio generation
docs/               specification, plans and the chat contract
datos/, comun/, contexto.md, SETUP.md   organiser material, read-only for the team
decisiones.md       log of decisions, constraints and data sources
ficha.json          tool card: name, tagline, sources, team, data type
```

## Run it locally

Requirements: [Bun](https://bun.sh) and Node 22 or later.

```sh
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:3000/punto-atencion-ciudadana/brujula-a>. The app lives under `/<team>` (the `equipo` field of `ficha.json`), also locally. Do not change that field.

Create `.env.local` (never committed). All keys are server-side only, never `NEXT_PUBLIC_*`:

| Variable | Purpose |
|---|---|
| `HELMCODE_API_KEY` | LLM and embeddings (OpenAI-compatible API from HelmCode). |
| `HELMCODE_MODEL` | Chat model (the event uses `glm5.3-flash`). |
| `HELMCODE_BASE_URL` | Optional. Defaults to `https://api.helmcode.com/v1`. |
| `JEV_API_KEY` | Optional. Without it, the HelmCode LLM does the classification. |
| `ELEVENLABS_API_KEY` | Optional. Without it, the dictation button is hidden. |
| `BRUJULA_MOTOR` | Optional. Force an engine: `jev`, `helmcode` or `simulado`. |

With no keys at all, the local app falls back to a simulated engine so the interface still works.

Checks:

```sh
bun run build                       # must pass before every push
bun run typecheck
bun scripts/unitarias.ts            # deterministic, no network
bun scripts/probar.ts [jev|llm|palabras]   # evaluates one engine on src/datos/pruebas.json (needs keys)
bun run probar:buscador             # semantic search accuracy and speed (needs keys)
bun run probar:agente               # follow-up chat loop (needs keys)
```

## Deploy

Every push to `main` is published automatically at <https://build.barraca.house/punto-atencion-ciudadana/brujula-a>. If `bun run build` fails, nothing is published. Keys are already set in the Vercel project.

## Event delivery

`ficha.json` describes the tool (`datos: "reales"` means public data, never personal). The event CLI checks the rules and registers the delivery; it needs `gh auth login`:

```sh
curl -fsSL https://build.barraca.house/instalar.sh | sh
buildnight ficha validar
buildnight revisar
buildnight registrar
```

## Credits

Team **brujula-a** at Build night · BARRACA x SOTI. Design system Sol by Reforma Digital (MIT). Official sources: [SEPE](https://sede.sepe.gob.es/), [Ajuntament de València](https://sede.valencia.es/), [Generalitat Valenciana](https://www.gva.es/) and the [PAG](https://administracion.gob.es/tramites-electronicos/resultados-actuaciones).
