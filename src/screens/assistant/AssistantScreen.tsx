import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { AssistantMessage } from '../../store/slices/assistant-slice';
import {
  loadAssistantHistory,
  loadOlderAssistantMessages,
  sendAssistantMessage,
  startNewAssistantChat,
} from '../../store/assistant-actions';

type ListItem =
  | { type: 'date'; key: string; label: string }
  | { type: 'message'; key: string; message: AssistantMessage };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// "Today" / "Yesterday" / "Mon, Sep 22" (+ year when not the current one).
function formatDateHeading(date: Date): string {
  const daysAgo = Math.round((startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / MS_PER_DAY);
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

function formatMessageTime(date: Date): string {
  // `hour12: false` forces 24-hour time regardless of locale default (most
  // locales this app might run under default to 12-hour with AM/PM).
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Messages sharing a local calendar date sit under one date heading, like
// WhatsApp — messages arrive in chronological order, so a heading is
// emitted whenever the date changes from the previous message.
function buildListItems(messages: AssistantMessage[]): ListItem[] {
  const items: ListItem[] = [];
  let lastDateKey = '';
  for (const message of messages) {
    const date = new Date(message.created_at);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (dateKey !== lastDateKey) {
      items.push({ type: 'date', key: `date-${dateKey}`, label: formatDateHeading(date) });
      lastDateKey = dateKey;
    }
    items.push({ type: 'message', key: message.id, message });
  }
  return items;
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  const isError = message.status === 'error';

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {isStreaming && !message.content ? (
          <Text style={styles.thinkingText}>Thinking…</Text>
        ) : (
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {message.content}
            {isStreaming ? ' ▍' : ''}
          </Text>
        )}
        {isError ? <Text style={styles.bubbleErrorText}>Failed to get a response. Please try again.</Text> : null}
        {/* {message.hideTime ? null : ( */}
        <Text style={[styles.timeText, isUser && styles.timeTextUser]}>
          {formatMessageTime(new Date(message.created_at))}
        </Text>
        {/* )} */}
      </View>
    </View>
  );
}

export function AssistantScreen() {
  const dispatch = useAppDispatch();
  const messages = useAppSelector((state) => state.assistant.messages);
  const conversationUuid = useAppSelector((state) => state.assistant.conversationUuid);

  const [draft, setDraft] = useState('');
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  // True only when the FIRST (page 1) history fetch is actually going to
  // happen on this mount — a persisted conversationUuid with nothing loaded
  // in memory yet (e.g. right after an app reload). Not the same spinner as
  // `isLoadingOlder` (scroll-up pagination, further down) — this one is
  // "the whole conversation is still loading," shown in place of the list.
  const [isLoadingHistory, setIsLoadingHistory] = useState(() => Boolean(conversationUuid) && messages.length === 0);
  // Assistant is a primary bottom-nav tab (unlike the form screens that use
  // AppShell's `hideBottomNav` — those are always reached by pushing, so
  // they always have a way back). Permanently hiding the bar here would
  // strand the user on this tab with no way off it. Instead it's hidden only
  // while the composer is actually focused — i.e. only while the keyboard
  // would be covering it — a fixed bottom nav living outside this screen's
  // own KeyboardAvoidingView is otherwise exactly the kind of competing
  // fixed element that leaves it unable to push the composer fully clear of
  // the keyboard.
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const listRef = useRef<FlatList<ListItem>>(null);

  const items = useMemo(() => buildListItems(messages), [messages]);
  const isStreaming = messages.some((message) => message.status === 'streaming');

  // Inverted list: newest item first in `data`, rendered at the bottom of the FlatList.
  const invertedData = useMemo(() => [...items].reverse(), [items]);

  // offset 0 on an inverted list IS the bottom — scrolling here is what a
  // normal chat's "stick to the latest message" behavior reduces to.
  const scrollToBottom = () => listRef.current?.scrollToOffset({ offset: 0, animated: true });

  // The conversation lives in Redux. It's created lazily by the first message
  // (see sendAssistantMessage). Re-entering the screen (e.g. back from another
  // tab) with a conversation still in memory swaps the local list for the
  // server-side history — see loadAssistantHistory.
  useEffect(() => {
    dispatch(loadAssistantHistory())
      .then(() => scrollToBottom())
      .finally(() => setIsLoadingHistory(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Guards against onEndReached firing repeatedly while the user stays
  // scrolled near the top — resets once the message count actually changes
  // (the load finished, or new messages arrived), same pattern DateScroller
  // uses for its own onEndReached.
  const hasTriggeredLoadOlderRef = useRef(false);
  useEffect(() => {
    hasTriggeredLoadOlderRef.current = false;
  }, [messages.length]);

  const handleLoadOlder = () => {
    if (hasTriggeredLoadOlderRef.current || isLoadingOlder) return;
    hasTriggeredLoadOlderRef.current = true;
    setIsLoadingOlder(true);
    dispatch(loadOlderAssistantMessages()).finally(() => setIsLoadingOlder(false));
  };

  const canSend = !isStreaming && !isLoadingHistory && draft.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    const text = draft.trim();
    setDraft('');
    dispatch(sendAssistantMessage(text));
    scrollToBottom();
  };

  return (
    <AppShell hideBottomNav={isComposerFocused}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Assistant</Text>
            <Text style={styles.subtitle}>Chat with your AI assistant.</Text>
          </View>
          {messages.length > 0 ? (
            <Pressable style={styles.newChatButton} onPress={() => startNewAssistantChat(dispatch)} hitSlop={8}>
              <MaterialIcons name="add-comment" size={18} color={Colors.primary} />
              <Text style={styles.newChatText}>New chat</Text>
            </Pressable>
          ) : null}
        </View>

        {isLoadingHistory ? (
          <View style={styles.initialLoading}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={styles.list}
            inverted
            data={invertedData}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onEndReached={handleLoadOlder}
            onEndReachedThreshold={0.4}
            // In an inverted list the footer (structurally after the last
            // data item, i.e. the OLDEST loaded message) renders at the visual
            // TOP — exactly where a "loading older messages" spinner belongs.
            ListFooterComponent={isLoadingOlder ? <ActivityIndicator color={Colors.primary} style={styles.loadingOlder} /> : null}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <MaterialIcons name="smart-toy" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>How can I help?</Text>
                <Text style={styles.emptyText}>Ask a question to start the conversation.</Text>
              </View>
            }
            renderItem={({ item }) =>
              item.type === 'date' ? (
                <View style={styles.dateChipRow}>
                  <View style={styles.dateChip}>
                    <Text style={styles.dateChipText}>{item.label}</Text>
                  </View>
                </View>
              ) : (
                <MessageBubble message={item.message} />
              )
            }
          />
        )}

        <View style={styles.composer}>
          <View style={styles.composerInner}>
            <TextInput
              style={styles.input}
              placeholder="Type a message…"
              placeholderTextColor={Colors.outline}
              value={draft}
              onChangeText={setDraft}
              onFocus={() => setIsComposerFocused(true)}
              onBlur={() => setIsComposerFocused(false)}
              multiline
            />
            <Pressable
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!canSend}
              accessibilityLabel="Send message"
            >
              <MaterialIcons name="send" size={20} color={Colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.gutter,
    padding: Spacing.containerPaddingMobile,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  headerText: {
    gap: 2,
    flexShrink: 1,
  },
  title: {
    ...Typography.headlineLgMobile,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 2,
    borderRadius: Radius.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  newChatText: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.unit * 3,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  initialLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOlder: {
    paddingVertical: Spacing.unit * 3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.unit * 2,
    paddingVertical: Spacing.sectionGap * 2,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondaryContainer,
  },
  emptyTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  emptyText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  dateChipRow: {
    alignItems: 'center',
    marginVertical: Spacing.unit * 2,
  },
  dateChip: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.unit * 3,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  dateChipText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    gap: 4,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 2,
    borderRadius: Radius.lg,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.sm,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderBottomLeftRadius: Radius.sm,
  },
  bubbleText: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  bubbleTextUser: {
    color: Colors.onPrimary,
  },
  thinkingText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  bubbleErrorText: {
    ...Typography.labelSm,
    color: Colors.error,
  },
  timeText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    alignSelf: 'flex-end',
  },
  timeTextUser: {
    color: Colors.inversePrimary,
  },
  composer: {
    padding: Spacing.unit * 3,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  composerInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.unit * 2,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  input: {
    ...Typography.bodyMd,
    flex: 1,
    maxHeight: 120,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    color: Colors.onSurface,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
