import { assistantApi } from '../lib/api/assistant';
import {
    addMessage,
    appendToMessage,
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
            dispatch(addMessage({ id: newId(), role: 'user', content: text, createdAt: now, status: 'done' }));
            dispatch(addMessage({ id: replyId, role: 'assistant', content: '', createdAt: now, status: 'streaming' }));

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

                console.log('conversationUuid: ', conversationUuid);

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

/**
 * Two kinds of chat list share the same slice: the LIVE list built locally
 * while the user chats (streamed replies land in it as they arrive), and the
 * HISTORY list fetched from the server. Called whenever the Assistant screen
 * is (re)entered — e.g. coming back from another tab — while a conversation
 * uuid is still in memory: the server history replaces the local list so
 * what's shown is the stored conversation. Skipped when there's no uuid
 * (logout / new chat wipe it), while a reply is streaming, or if the user
 * sends something while the request is in flight (never clobber live
 * messages), and an empty server result never wipes local messages. Reads the
 * first page only; assumes date groups and the messages inside each are
 * returned oldest-first.
 */
export const loadAssistantHistory =
    () =>
        async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
            const { conversationUuid, messages } = getState().assistant;
            if (!conversationUuid || messages.some((message) => message.status === 'streaming')) return;
            const messageCountAtStart = messages.length;
            try {
                const page = await assistantApi.getConversations(conversationUuid);
                const current = getState().assistant;
                const isStale =
                    current.conversationUuid !== conversationUuid ||
                    current.messages.length !== messageCountAtStart ||
                    current.messages.some((message) => message.status === 'streaming');
                if (isStale) return;
                const history: AssistantMessage[] = [...page.results]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .flatMap((group) =>
                        group.messages.map((message) => ({
                            id: message.uuid,
                            role: message.role,
                            content: message.content,
                            createdAt: groupDateToIso(group.date),
                            status: 'done' as const,
                            hideTime: true,
                        })),
                    );
                if (history.length > 0) dispatch(setMessages(history));
            } catch (error) {
                if (__DEV__) console.warn('Failed to load assistant history', error);
            }
        };
