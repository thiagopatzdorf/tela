import { dispatch, getSchema } from './commands'

/**
 * Agent RPC bridge. Lets a parent window (a host app, or an agent harness driving the
 * iframe) run canvas commands over postMessage, and also exposes a direct
 * `window.tela` handle for same-window scripting / devtools.
 *
 * Wire protocol (both directions tagged with source SOURCE):
 *   in : { source, type:'command', id, command:{ op, ...args } }
 *   out: { source, type:'command-result', id, result:{ ok, result?, error? } }
 *
 * The production embed is same-origin. Commands from any other origin or window
 * are rejected: a source tag is not an authentication boundary.
 */

const SOURCE = 'tela-agent'

interface CommandMessage {
  source: string
  type: 'command'
  id?: string | number
  command: { op: string; [k: string]: unknown }
}

function isCommandMessage(d: unknown): d is CommandMessage {
  return !!d && typeof d === 'object' && (d as CommandMessage).source === SOURCE && (d as CommandMessage).type === 'command'
}

export function installAgentRpc(): () => void {
  if (typeof window === 'undefined') return () => {}

  // Direct handle: an agent scripting the page (or you, in devtools) can call
  // window.tela.dispatch({ op:'getSchema' }) without postMessage plumbing.
  ;(window as unknown as { tela: unknown }).tela = { dispatch, getSchema }

  const onMessage = async (e: MessageEvent) => {
    if (!isCommandMessage(e.data)) return
    if (e.origin !== window.location.origin || e.source !== window.parent) return
    const source = e.source as Window | null
    const result = await dispatch(e.data.command)
    const reply = { source: SOURCE, type: 'command-result', id: e.data.id, result }
    // Reply to whoever asked (parent frame or opener).
    source?.postMessage(reply, { targetOrigin: e.origin })
  }

  window.addEventListener('message', onMessage)
  return () => window.removeEventListener('message', onMessage)
}
