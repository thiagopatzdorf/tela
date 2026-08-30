/**
 * Endpoint + fetch helper for the optional AI Assist feature.
 *
 * Tela ships with NO backend. The AI panel is a thin client that POSTs
 * to an endpoint you provide, so you can proxy to Anthropic, OpenAI, or any
 * provider from your own server and keep API keys out of the browser. Configure:
 *
 *   VITE_AI_API_ORIGIN   base origin, e.g. https://your-api.example.com
 *   VITE_AI_API_PATH     request path (default: /api/tela-ai)
 *
 * When `VITE_AI_API_ORIGIN` is unset the AI features stay dormant (`AI_ENABLED`
 * is false) and the app is fully usable without them. The request/response
 * contract is documented in `docs/ai-endpoint.md`.
 */
const AI_ORIGIN = (import.meta.env.VITE_AI_API_ORIGIN as string | undefined) ?? "";
const AI_PATH = (import.meta.env.VITE_AI_API_PATH as string | undefined) ?? "/api/tela-ai";

/** True when an AI endpoint has been configured. Gate AI UI on this. */
export const AI_ENABLED = AI_ORIGIN !== "";

export const CANVAS_AI_ENDPOINT = `${AI_ORIGIN}${AI_PATH}`;

export interface CanvasAIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CanvasAIRequest {
  model: string;
  system: string;
  messages: CanvasAIChatMessage[];
  maxTokens: number;
  stream?: boolean;
  signal?: AbortSignal;
}

export interface TelaCommandsResponse {
  commands: Array<{ op: string; [key: string]: unknown }>
  discarded: unknown[]
}

const COMMAND_ENDPOINT = (import.meta.env.VITE_FACTORY_COMMANDS_ENDPOINT as string | undefined) ?? ""
const COMMAND_KEY = (import.meta.env.VITE_FACTORY_TELA_API_KEY as string | undefined) ?? ""

export async function requestTelaCommands(message: string, schema: unknown, state: unknown): Promise<TelaCommandsResponse> {
  if (!COMMAND_ENDPOINT) throw new Error('A conexão com a Factory não está configurada.')
  const response = await fetch(COMMAND_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(COMMAND_KEY ? { 'X-Factory-Tela-Key': COMMAND_KEY } : {}) },
    credentials: 'include',
    body: JSON.stringify({ message, schema, state }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || data.detail || `Request failed (${response.status})`)
  return data as TelaCommandsResponse
}

/** POST to the configured AI endpoint. Credentials are included so a same-origin
 *  proxy can use session cookies; a cross-origin proxy must allow them via CORS. */
export async function postCanvasAI(req: CanvasAIRequest): Promise<Response> {
  if (!AI_ENABLED) {
    throw new Error(
      "AI Assist is not configured. Set VITE_AI_API_ORIGIN to point at your AI proxy endpoint.",
    );
  }

  const { signal, ...bodyFields } = req;
  const response = await fetch(CANVAS_AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(bodyFields),
    signal,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // non-JSON error body — keep the status message
    }
    throw new Error(message);
  }

  return response;
}
