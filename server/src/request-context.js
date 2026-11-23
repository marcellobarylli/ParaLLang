import { AsyncLocalStorage } from 'node:async_hooks';

// Round 171: who made the request now being served, for code far from Express (the friend router). `access` is
// 'owner' (PARALLANG_TOKEN, or no token configured) or 'friend' (PARALLANG_FRIEND_CODE); `geminiKey` is the
// friend's own key from X-Gemini-Key, if they gave one. Calls started during a request (a greeting written ahead)
// keep its context.
export const requestContext = new AsyncLocalStorage();
export const currentRequest = () => requestContext.getStore() ?? null;
