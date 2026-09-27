import { fetch as streamingFetch } from 'expo/fetch';
import { PaginatedResponse } from "../../constants/types";
import baseApi, { getApiErrorMessage } from "./base_api";
import { isTokenValid, refreshAccessToken } from "./refresh_token_strategy";
import { apiPath, tokenStore } from "./utils";

export type InitConversationResponse = {
    uuid: string;
    created_at: string;
};

export type ConversationMessage = {
    uuid: string;
    role: 'user' | 'assistant';
    content: string;
}

export type ConversationResponse = {
    date: string;
    messages: ConversationMessage[];
}

export type StreamMessageOptions = {
    /** Called once per streamed chunk with only the NEW text, not the accumulated reply. */
    onDelta: (delta: string) => void;
    signal?: AbortSignal;
};

const ASSISTANT_PATH = '/assistant/conversations/';

// Set to `true` to run the whole assistant against local fakes (no network)
// — handy for UI work without a backend. `false` uses the real endpoints.
// Nothing outside this file cares which: callers only see `onDelta` chunks.
const USE_MOCK_ASSISTANT = false;

const MOCK_REPLIES = [
    "Sure — I can help with that. Based on your organization's data, here's a quick summary: schedules for this week are published, and hours are tracking normally. Let me know if you'd like a breakdown by employee or by day.",
    "Good question. Night shift, weekend and festival hours are added on top of the base hourly rate, so they show up as separate lines in the hours summary. Want me to walk through an example?",
    "Here's what I'd suggest: review the published schedule first, then compare it against the hours summary for the same date range. If anything looks off, I can help you narrow it down.",
];
let mockReplyIndex = 0;

function wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(new Error('Aborted'));
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Aborted'));
        });
    });
}

async function mockStreamMessage(_message: string, { onDelta, signal }: StreamMessageOptions): Promise<void> {
    const reply = MOCK_REPLIES[mockReplyIndex % MOCK_REPLIES.length];
    mockReplyIndex += 1;
    await wait(700, signal); // "thinking" delay before the first chunk
    for (const chunk of reply.match(/\S+\s*/g) ?? [reply]) {
        await wait(45, signal);
        onDelta(chunk);
    }
}

// Real send: POST {message}, reply arrives as Server-Sent Events. axios can't
// stream on React Native, so this uses `expo/fetch` (streaming body reader)
// — which also means base_api's interceptors don't run, so the Bearer token
// (proactively refreshed, mirroring base_api's request interceptor) is
// attached by hand. A 401 here does NOT trigger base_api's reactive
// logout-on-401 handling.
//
// The exact event payload wasn't specified, so the parser is deliberately
// tolerant: each event's `data:` is JSON (text taken from `delta` / `content`
// / `text` / `token`, optionally nested under `data`) or plain text; a
// `[DONE]` payload or `event: done` ends the stream, `event: error` (or an
// `error` field) throws. Unrecognized JSON payloads are ignored (logged in
// dev) — adjust `extractDelta` once the real payload shape is confirmed.
function extractDelta(data: string): string | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(data);
    } catch {
        return data; // not JSON — treat the raw text as the chunk
    }
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>;
        if (record.error) throw new Error(typeof record.error === 'string' ? record.error : 'The assistant reported an error.');
        const payload = (record.data && typeof record.data === 'object' ? record.data : record) as Record<string, unknown>;
        for (const key of ['delta', 'content', 'text', 'token']) {
            if (typeof payload[key] === 'string') return payload[key] as string;
        }
    }
    if (__DEV__) console.warn('[assistant] ignoring unrecognized stream payload', data);
    return null;
}

async function streamedResponse(url: string, payload: any, { onDelta, signal }: StreamMessageOptions,) {
    let token = tokenStore.get();
    if (token && !isTokenValid(token)) token = (await refreshAccessToken()) ?? token;

    const response = await streamingFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal,
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(body, `Request failed (${response.status}).`));
    }
    if (!response.body) throw new Error('The assistant response had no body to stream.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Returns true when the stream should stop (done marker).
    const handleEvent = (rawEvent: string): boolean => {
        let eventName = '';
        const dataLines: string[] = [];
        for (const line of rawEvent.split(/\r?\n/)) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
        }
        if (eventName === 'error') throw new Error(dataLines.join('\n') || 'The assistant reported an error.');
        if (eventName === 'done') return true;
        const data = dataLines.join('\n');
        if (!data) return false;
        if (data.trim() === '[DONE]') return true;
        const delta = extractDelta(data);
        if (delta) onDelta(delta);
        return false;
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.match(/\r?\n\r?\n/);
        while (boundary && boundary.index !== undefined) {
            const rawEvent = buffer.slice(0, boundary.index);
            buffer = buffer.slice(boundary.index + boundary[0].length);
            if (handleEvent(rawEvent)) return;
            boundary = buffer.match(/\r?\n\r?\n/);
        }
    }
    if (buffer.trim()) handleEvent(buffer); // stream ended without a trailing blank line
}

// async function realStreamMessage(
//     conversationUuid: string,
//     message: string,
//     { onDelta, signal }: StreamMessageOptions,
// ): Promise<void> {

//     const url = `${process.env.EXPO_PUBLIC_API_URL}${apiPath(`${ASSISTANT_PATH}${conversationUuid}/messages/`)}`;
//     await streamedResponse(url, { message }, { onDelta, signal });
// }

export const assistantApi = {
    async initConversation(): Promise<InitConversationResponse> {
        const response = await baseApi.post(apiPath(ASSISTANT_PATH));
        return response.data;
    },
    async getConversations(conversationUuid: string): Promise<PaginatedResponse<ConversationResponse>> {
        const response = await baseApi.get(apiPath(`${ASSISTANT_PATH}${conversationUuid}/messages/`));
        return response.data;
    },
    /** Sends a message and resolves once the streamed reply has fully arrived. */
    async streamMessage(conversationUuid: string, message: string, { onDelta, signal }: StreamMessageOptions): Promise<void> {
        const url = `${process.env.EXPO_PUBLIC_API_URL}${apiPath(`${ASSISTANT_PATH}${conversationUuid}/messages/`)}`;
        return await streamedResponse(url, { message }, { onDelta, signal });
        // return realStreamMessage(conversationUuid, message, { onDelta, signal });
    },
};
