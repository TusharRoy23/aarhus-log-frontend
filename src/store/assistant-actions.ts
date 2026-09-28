import { assistantApi, type ConversationResponse } from '../lib/api/assistant';
import type { PaginatedResponse } from '../constants/types';
import {
    addMessage,
    appendToMessage,
    prependMessages,
    resetAssistant,
    setConversation,
    setMessages,
    setMessageStatus,
    type AssistantMessage,
} from './slices/assistant-slice';
import type { AppDispatch, RootState } from './store';

// Kept out of assistant-slice.ts for the same import-cycle reason as
// permissions-actions.ts (this needs `assistantApi` -> `baseApi`, and
// base_api.ts dispatches `resetAssistant` from the pure slice on 401).
//
// The stream is driven from here — not from the screen — so it keeps running
// (and keeps appending into Redux) if the user switches tabs mid-reply.

let activeController: AbortController | null = null;

let idCounter = 0;
const newId = () => `${Date.now()}-${idCounter++}`;

/** Discards the current conversation (and cancels any in-flight reply). The next message starts a fresh one. */
export function startNewAssistantChat(dispatch: AppDispatch): void {
    activeController?.abort();
    activeController = null;
    dispatch(resetAssistant());
}

// A thunk (not a plain function taking the uuid) so it can re-read state
// after the awaits below: logout/"new chat" can wipe the conversation while
// `initConversation` is still in flight, and that late uuid must not be
// adopted into the wiped (or next user's) state.
export const sendAssistantMessage =
    (text: string) =>
        async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
            const now = new Date().toISOString();
            const replyId = newId();
            dispatch(addMessage({ id: newId(), role: 'user', content: text, created_at: now, status: 'done' }));
            dispatch(addMessage({ id: replyId, role: 'assistant', content: '', created_at: now, status: 'streaming' }));

            const controller = new AbortController();
            activeController = controller;
            try {
                // The conversation is created lazily, on the first message — just
                // opening the Assistant tab never hits the API.
                let conversationUuid = getState().assistant.conversationUuid;
                if (!conversationUuid) {
                    conversationUuid = (await assistantApi.initConversation()).uuid;
                    const stillCurrent = getState().assistant.messages.some((message) => message.id === replyId);
                    if (controller.signal.aborted || !stillCurrent) return;
                    dispatch(setConversation(conversationUuid));
                }

                await assistantApi.streamMessage(conversationUuid, text, {
                    signal: controller.signal,
                    onDelta: (delta) => dispatch(appendToMessage({ id: replyId, delta })),
                });
                dispatch(setMessageStatus({ id: replyId, status: 'done' }));
            } catch {
                // Aborted by "new chat" — the messages are already gone, nothing to mark.
                if (!controller.signal.aborted) dispatch(setMessageStatus({ id: replyId, status: 'error' }));
            } finally {
                if (activeController === controller) activeController = null;
            }
        };

// Group headers from the server are dates (or datetimes); anchor a date-only
// value at local noon so the calendar day can't shift with timezone/DST.
function groupDateToIso(date: string): string {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const parsed = dateOnly
        ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
        : new Date(date);
    return (Number.isNaN(parsed.getTime()) ? new Date() : parsed).toISOString();
}

// Shared by loadAssistantHistory (page 1) and loadOlderAssistantMessages
// (every page after it) — same API shape, same newest-to-oldest-at-every-
// level ordering that needs reversing for chronological display.
function mapHistoryPage(page: PaginatedResponse<ConversationResponse>): AssistantMessage[] {
    return [...page.results]
        .sort((a, b) => a.date.localeCompare(b.date))
        .flatMap((group) =>
            [...group.messages].reverse().map((message) => ({
                id: message.uuid,
                role: message.role,
                content: message.content,
                created_at: groupDateToIso(message.created_at),
                status: 'done' as const
            })),
        );
}

// The "next page" cursor for loadOlderAssistantMessages, tagged with the
// conversation it belongs to. Plain module state (like `activeController`
// above) rather than Redux — it's an internal fetch-mechanism detail, not
// something the UI reads directly. Tagging it with `conversationUuid` (rather
// than relying on some external reset call) is what keeps a stale cursor
// from a previous conversation/user from ever being used after "new chat" or
// a logout+re-login in the same app session — base_api.ts can't import this
// file to reset it directly (would create the same import cycle
// permissions-actions.ts already documents avoiding), so self-invalidating
// via the uuid is the robust option rather than a cross-file reset.
let historyCursor: { conversationUuid: string; nextUrl: string | null } | null = null;
let isFetchingOlderHistory = false;

/**
 * Loads the first (most recent) page of server history — but ONLY the very
 * first time this conversation is seen (`messages.length === 0`), e.g. right
 * after the app reloads with a persisted `conversationUuid` but no messages
 * in memory yet. Called on every Assistant screen mount, but is a no-op on
 * every mount after the first: once anything is loaded — live chat messages,
 * or older pages already fetched via loadOlderAssistantMessages — it's left
 * alone. Earlier this re-fetched (and replaced the list) on every re-entry,
 * which both re-hit the API pointlessly on every tab switch AND reset
 * `historyCursor` back to page 1, silently discarding any older pages the
 * user had already scrolled up to load — this is the fix for both.
 */
export const loadAssistantHistory =
    () =>
        async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
            const { conversationUuid, messages } = getState().assistant;
            if (!conversationUuid || messages.length > 0) return;
            const messageCountAtStart = messages.length;
            try {
                const page = await assistantApi.getConversations(conversationUuid);
                const current = getState().assistant;
                const isStale =
                    current.conversationUuid !== conversationUuid ||
                    current.messages.length !== messageCountAtStart ||
                    current.messages.some((message) => message.status === 'streaming');
                if (isStale) return;
                historyCursor = { conversationUuid, nextUrl: page.next };
                const history = mapHistoryPage(page);
                if (history.length > 0) dispatch(setMessages(history));
            } catch (error) {
                if (__DEV__) console.warn('Failed to load assistant history', error);
            }
        };

/**
 * Loads the NEXT (older) page and prepends it — triggered by scrolling up.
 * Unlike loadAssistantHistory, this must NOT replace the list or move the
 * scroll position: the screen relies on an inverted FlatList, where
 * appending to the far end of the (reversed) data is naturally
 * non-disruptive, so the user stays exactly where they were scrolled to.
 */
export const loadOlderAssistantMessages =
    () =>
        async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
            const { conversationUuid } = getState().assistant;
            if (
                !conversationUuid ||
                isFetchingOlderHistory ||
                !historyCursor ||
                historyCursor.conversationUuid !== conversationUuid ||
                !historyCursor.nextUrl
            ) {
                return;
            }
            isFetchingOlderHistory = true;
            try {
                const page = await assistantApi.getConversations(conversationUuid, historyCursor.nextUrl);
                // Bail if "new chat"/logout swapped the conversation while this was in flight.
                if (getState().assistant.conversationUuid !== conversationUuid) return;
                historyCursor = { conversationUuid, nextUrl: page.next };
                const olderMessages = mapHistoryPage(page);
                if (olderMessages.length > 0) dispatch(prependMessages(olderMessages));
            } catch (error) {
                if (__DEV__) console.warn('Failed to load older assistant messages', error);
            } finally {
                isFetchingOlderHistory = false;
            }
        };
