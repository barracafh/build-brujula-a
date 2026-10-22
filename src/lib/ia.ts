// HelmCode habla la API de OpenAI. Úsalo solo desde el servidor (rutas de
// src/app/api o Server Actions): en el navegador la clave no existe, y así debe ser.
// El modelo del evento (glm5.3-flash) lee texto e imágenes: para una imagen,
// manda `content` como lista de partes, con la imagen en data URL o https.
export type Parte =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
export type Mensaje = {
  role: "system" | "user" | "assistant";
  content: string | Parte[];
};

// Herramientas (function calling). HelmCode las acepta como OpenAI, pero no
// las ejecuta: el loop es nuestro (src/lib/motor/agente.ts).
export type Herramienta = {
  type: "function";
  function: { name: string; description: string; parameters: object };
};
export type LlamadaHerramienta = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};
export type MensajeAsistente = {
  role: "assistant";
  content: string | null;
  tool_calls?: LlamadaHerramienta[];
  // Modelos con razonamiento (DeepSeek): hay que devolverlo tal cual en la
  // siguiente vuelta del loop, o la API puede rechazarla.
  reasoning_content?: string;
};
export type MensajeChat =
  | Mensaje
  | MensajeAsistente
  | { role: "tool"; tool_call_id: string; content: string };

export async function completar(
  messages: Mensaje[],
  { signal }: { signal?: AbortSignal } = {},
): Promise<string> {
  const data = await (await pedir({ messages }, signal)).json();
  return data.choices[0].message.content;
}

// Una vuelta del loop: devuelve el mensaje del asistente tal cual, con texto
// o con llamadas a herramientas, listo para añadirlo a `messages`. Con
// `alTexto`, pide la respuesta en streaming y le pasa cada trozo de texto
// según llega (el razonamiento y las llamadas no se pasan).
export async function conversar(
  messages: MensajeChat[],
  {
    tools,
    toolChoice = "auto",
    signal,
    alTexto,
  }: {
    tools: Herramienta[];
    toolChoice?: "auto" | "none";
    signal?: AbortSignal;
    alTexto?: (trozo: string) => void;
  },
): Promise<MensajeAsistente> {
  const cuerpo = { messages, tools, tool_choice: toolChoice };
  const { content, tool_calls, reasoning_content } = alTexto
    ? await leerStream(await pedir({ ...cuerpo, stream: true }, signal), alTexto)
    : (await (await pedir(cuerpo, signal)).json()).choices[0].message;
  return {
    role: "assistant",
    content: content || null,
    ...(tool_calls?.length ? { tool_calls } : {}),
    ...(reasoning_content ? { reasoning_content } : {}),
  };
}

// Junta los trozos del stream (formato SSE de OpenAI) en un solo mensaje.
async function leerStream(
  res: Response,
  alTexto: (trozo: string) => void,
): Promise<{
  content: string;
  tool_calls: LlamadaHerramienta[];
  reasoning_content: string;
}> {
  let content = "";
  let reasoning_content = "";
  const tool_calls: LlamadaHerramienta[] = [];
  const lector = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let resto = "";
  for (;;) {
    const { value, done } = await lector.read();
    if (done) break;
    const lineas = (resto + value).split("\n");
    resto = lineas.pop() ?? "";
    for (const linea of lineas) {
      const datos = linea.startsWith("data:") ? linea.slice(5).trim() : "";
      if (!datos || datos === "[DONE]") continue;
      const delta = JSON.parse(datos).choices?.[0]?.delta ?? {};
      if (delta.reasoning_content) reasoning_content += delta.reasoning_content;
      if (delta.content) {
        content += delta.content;
        alTexto(delta.content);
      }
      for (const t of delta.tool_calls ?? []) {
        const i = t.index ?? tool_calls.length;
        tool_calls[i] ??= {
          id: "",
          type: "function",
          function: { name: "", arguments: "" },
        };
        if (t.id) tool_calls[i].id = t.id;
        if (t.function?.name) tool_calls[i].function.name += t.function.name;
        if (t.function?.arguments)
          tool_calls[i].function.arguments += t.function.arguments;
      }
    }
  }
  return { content, tool_calls: tool_calls.filter(Boolean), reasoning_content };
}

async function pedir(cuerpo: object, signal?: AbortSignal): Promise<Response> {
  const { HELMCODE_API_KEY, HELMCODE_BASE_URL, HELMCODE_MODEL } = process.env;
  if (!HELMCODE_API_KEY || !HELMCODE_MODEL)
    throw new Error("Faltan HELMCODE_API_KEY o HELMCODE_MODEL en .env.local");
  // Todos los equipos comparten límites: ante un 429, espera y reintenta.
  for (let intento = 0; ; intento++) {
    const res = await fetch(
      `${HELMCODE_BASE_URL ?? "https://api.helmcode.com/v1"}/chat/completions`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${HELMCODE_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ model: HELMCODE_MODEL, ...cuerpo }),
        signal,
      },
    );
    if (res.status === 429 && intento < 3 && !signal?.aborted) {
      const espera = Number(res.headers.get("retry-after")) || 2 ** intento;
      await esperar(Math.min(espera, 10) * 1000, signal);
      continue;
    }
    if (!res.ok) throw new Error(`HelmCode respondió ${res.status}`);
    return res;
  }
}

function esperar(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolver, rechazar) => {
    if (signal?.aborted) return rechazar(signal.reason);
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", alAbortar);
      resolver();
    }, ms);
    function alAbortar() {
      clearTimeout(t);
      rechazar(signal?.reason);
    }
    signal?.addEventListener("abort", alAbortar, { once: true });
  });
}
