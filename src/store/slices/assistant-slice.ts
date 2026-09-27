import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AssistantMessageRole = 'user' | 'assistant';
export type AssistantMessageStatus = 'streaming' | 'done' | 'error';

export type AssistantMessage = {
    id: string;
    role: AssistantMessageRole;
    content: string;
    /** ISO timestamp — messages are grouped by its local calendar date. */
    createdAt: string;
    status: AssistantMessageStatus;
    /** History from the server only carries a date per group, not a time per message. */
    hideTime?: boolean;
};

type AssistantState = {
    conversationUuid: string | null;
    messages: AssistantMessage[];
};

const initialState: AssistantState = {
    conversationUuid: null,
    messages: [],
};

// In-memory only: deliberately NOT in store.ts's persist whitelist. The
// conversation lives until logout or an explicit "new chat" — surviving a
// tab switch (this slice outlives the Assistant screen), not an app restart.
// Kept free of any lib/api import so base_api.ts can dispatch
// `resetAssistant` on 401 without creating an import cycle (same reasoning
// as permissions-slice.ts).
const assistantSlice = createSlice({
    name: 'assistant',
    initialState,
    reducers: {
        setConversation: (state, action: PayloadAction<string>) => {
            state.conversationUuid = action.payload;
        },
        setMessages: (state, action: PayloadAction<AssistantMessage[]>) => {
            state.messages = action.payload;
        },
        addMessage: (state, action: PayloadAction<AssistantMessage>) => {
            state.messages.push(action.payload);
        },
        // Ignored when the id no longer exists (e.g. a stream still
        // delivering chunks after "new chat" or logout wiped the messages).
        appendToMessage: (state, action: PayloadAction<{ id: string; delta: string }>) => {
            const message = state.messages.find((m) => m.id === action.payload.id);
            if (message) message.content += action.payload.delta;
        },
        setMessageStatus: (state, action: PayloadAction<{ id: string; status: AssistantMessageStatus }>) => {
            const message = state.messages.find((m) => m.id === action.payload.id);
            if (message) message.status = action.payload.status;
        },
        resetAssistant: () => initialState,
    },
});

export const { setConversation, setMessages, addMessage, appendToMessage, setMessageStatus, resetAssistant } =
    assistantSlice.actions;
export default assistantSlice.reducer;
