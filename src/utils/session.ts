// =========================================================================
// Session ID anônimo — usado para agrupar eventos analíticos
// NÃO contém dados pessoais. É um UUID gerado no primeiro acesso e
// persistido em localStorage. Nunca é enviado a terceiros.
// =========================================================================

const SESSION_STORAGE_KEY = 'jr-textil-session:v1';

/**
 * Gera um UUID v4 simples (compatível com navegadores antigos).
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback para ambientes sem crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Recupera o session_id do localStorage ou cria um novo se não existir.
 * O mesmo ID é reutilizado em todas as visitas do mesmo navegador.
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return generateUUID();

  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.length > 0) return existing;

    const newId = generateUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, newId);
    return newId;
  } catch {
    // Se localStorage estiver indisponível (modo privado, por exemplo),
    // retorna um UUID efêmero para a sessão atual.
    return generateUUID();
  }
}

/**
 * Limpa o session_id atual. Útil para testes ou reset manual.
 */
export function resetSessionId(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // silencioso
  }
}