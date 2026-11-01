"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { useToast } from "@/components/ui/toast-provider";
import { ApiError, collectPages, isApiConfigured } from "@/lib/api/client";
import * as messagesApi from "@/lib/api/messages";
import type { ApiConversation, ApiMessage } from "@/lib/api/messages";
import { readStoredJson, STORAGE_KEYS, writeStoredJson } from "@/lib/local-storage";
import type { ConversationMessage, UserConversation } from "@/lib/messages-types";

/**
 * Message threads, in whichever mode the deployment is configured for.
 *
 * Both modes present the same `UserConversation` shape, so the message views
 * render identically whether a thread came from PostgreSQL or from this
 * browser's own device-local threads.
 *
 * In server mode the list arrives without its messages — the API returns only
 * the latest one per conversation — so `loadThread` fetches the rest when a
 * thread is opened.
 */
export interface ConversationsState {
  conversations: UserConversation[];
  ready: boolean;
  failed: boolean;
  refresh: () => void;
  serverBacked: boolean;
  /** Fetches the full thread. Does not mark anything read. Safe to call repeatedly. */
  loadThread: (conversationId: string) => void;
  /** Clears the unread count, for when the reader actually opens the thread. */
  markRead: (conversationId: string) => void;
  /** @returns true when the reply was stored. */
  sendReply: (conversationId: string, text: string) => Promise<boolean>;
  /**
   * Lister-side: opens or reuses a thread with the seeker that requested the
   * given viewing. @returns the resulting conversation id, or null when the
   * server refused it. Device mode has no viewings backend, so returns null
   * and advises the caller to say so.
   */
  startFromViewing: (viewingId: string) => Promise<string | null>;
}

function relativeTime(iso: string) {
  const elapsed = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toConversationMessage(message: ApiMessage, viewerId: string): ConversationMessage {
  return {
    id: message.id,
    // "user" is whoever is looking; "owner" is the other participant.
    sender: message.senderId === viewerId ? "user" : "owner",
    text: message.body,
    time: relativeTime(message.createdAt),
    isRead: message.isRead,
  };
}

function toUserConversation(conversation: ApiConversation, viewerId: string): UserConversation {
  const counterpart = conversation.seeker.id === viewerId ? conversation.lister : conversation.seeker;
  const latest = conversation.messages[0];
  return {
    id: conversation.id,
    contact: `${counterpart.firstName} ${counterpart.lastName}`.trim(),
    propertyId: conversation.propertyId,
    propertySnapshot: { id: conversation.property.id, title: conversation.property.title, township: conversation.property.township, images: conversation.property.images.map((image) => image.url) },
    preview: latest?.body ?? "",
    time: relativeTime(latest?.createdAt ?? conversation.updatedAt),
    unread: conversation.unreadCount > 0,
    seekerId: conversation.seeker.id,
    seekerName: `${conversation.seeker.firstName} ${conversation.seeker.lastName}`.trim(),
    thread: latest ? [toConversationMessage(latest, viewerId)] : [],
  };
}

export function useConversations(): ConversationsState {
  const serverBacked = isApiConfigured();
  const { user, status } = useAuth();
  const { tx } = useLanguage();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<UserConversation[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);
  // A ref, not state: `loadThread` must keep a stable identity so an effect that
  // loads the visible thread cannot loop.
  const loadedThreads = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    if (!serverBacked) {
      const stored = readStoredJson<UserConversation[]>(STORAGE_KEYS.conversations, []);
      queueMicrotask(() => {
        if (cancelled) return;
        setConversations(stored);
        setReady(true);
      });
      return () => { cancelled = true; };
    }

    if (status === "loading") return;
    if (status !== "authenticated" || !user) {
      queueMicrotask(() => {
        if (cancelled) return;
        setConversations([]);
        setReady(true);
      });
      return () => { cancelled = true; };
    }

    const viewerId = user.id;
    void (async () => {
      try {
        const records = await collectPages(messagesApi.listConversations);
        if (cancelled) return;
        loadedThreads.current.clear();
        setConversations(records.map((conversation) => toUserConversation(conversation, viewerId)));
        setFailed(false);
      } catch {
        // An empty list is honest when the API cannot be reached; showing the
        // demo threads here would invent correspondence that does not exist.
        if (!cancelled) { setConversations([]); setFailed(true); }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [serverBacked, status, user, reloadToken]);

  const loadThread = useCallback((conversationId: string) => {
    if (!serverBacked || !user) return;
    if (loadedThreads.current.has(conversationId)) return;
    loadedThreads.current.add(conversationId);

    const viewerId = user.id;
    void (async () => {
      try {
        const messages: ApiMessage[] = [];
        const cursors = new Set<string>();
        let before: string | undefined;
        do {
          const result = await messagesApi.listMessages(conversationId, before);
          messages.push(...result.data);
          const next = result.meta.nextCursor;
          if (next && cursors.has(next)) throw new Error("Repeated message cursor");
          if (next) cursors.add(next);
          before = next ?? undefined;
        } while (before);
        // The API returns newest first; the thread view reads oldest first.
        const thread = [...new Map(messages.map((message) => [message.id, message])).values()].reverse().map((message) => toConversationMessage(message, viewerId));
        setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, thread: [...thread, ...item.thread.filter((message) => !thread.some((loaded) => loaded.id === message.id))] } : item));
      } catch {
        // Allow a later retry rather than leaving the thread permanently blank.
        loadedThreads.current.delete(conversationId);
        toast({
          tone: "error",
          title: tx("Could not open this conversation", "ဤစကားပြောမှုကို ဖွင့်မရပါ"),
          description: tx("Check your connection and try again.", "အင်တာနက်ချိတ်ဆက်မှုကို စစ်ပြီး ထပ်မံကြိုးစားပါ။"),
        });
      }
    })();
  }, [serverBacked, user, toast, tx]);

  /** Read receipts are only sent when the reader opens a thread themselves. */
  const markRead = useCallback((conversationId: string) => {
    const acknowledge = () => setConversations((current) => {
      const next = current.map((item) => item.id === conversationId ? { ...item, unread: false } : item);
      if (!serverBacked) writeStoredJson(STORAGE_KEYS.conversations, next);
      return next;
    });
    if (!serverBacked) { acknowledge(); return; }
    void messagesApi.markConversationRead(conversationId).then(acknowledge).catch(() => {
      toast({ tone: "error", title: tx("Could not mark this conversation as read", "ဤစာပြောဆိုမှုကို ဖတ်ပြီးအဖြစ် မှတ်သား၍မရပါ") });
    });
  }, [serverBacked, toast, tx]);

  const sendReply = useCallback(async (conversationId: string, text: string) => {
    const body = text.trim();
    if (!body) return false;

    if (!serverBacked) {
      setConversations((current) => {
        const next = current.map((conversation) => conversation.id === conversationId ? {
          ...conversation,
          preview: body,
          time: "Just now",
          thread: [...conversation.thread, { id: `${conversation.id}-${Date.now()}`, sender: "user" as const, text: body, time: "Just now" }],
        } : conversation);
        writeStoredJson(STORAGE_KEYS.conversations, next);
        return next;
      });
      return true;
    }

    try {
      const created = await messagesApi.sendMessage(conversationId, body);
      setConversations((current) => current.map((conversation) => conversation.id === conversationId ? {
        ...conversation,
        preview: created.body,
        time: relativeTime(created.createdAt),
        thread: [...conversation.thread, { id: created.id, sender: "user" as const, text: created.body, time: relativeTime(created.createdAt), isRead: created.isRead }],
      } : conversation));
      return true;
    } catch (error) {
      toast({
        tone: "error",
        title: tx("Your reply was not sent", "သင့်အကြောင်းပြန်ချက် မပေးပို့နိုင်ပါ"),
        description: error instanceof ApiError && error.needsEmailVerification
          ? tx("Confirm your email address first, then try again.", "သင့်အီးမေးလ်လိပ်စာကို အရင်အတည်ပြုပြီးမှ ထပ်မံကြိုးစားပါ။")
          : error instanceof TypeError
            ? tx("Cannot reach the server. It may be restarting or offline. Your reply is still here; try again when the connection returns.", "Server ကို ချိတ်ဆက်၍မရပါ။ ပြန်လည်စတင်နေခြင်း သို့မဟုတ် ပိတ်နေခြင်း ဖြစ်နိုင်ပါသည်။ ပြန်စာ မပျောက်ပါ။ ချိတ်ဆက်မှုပြန်ရပါက ထပ်ပို့ပါ။")
          : tx("Check your connection and try again.", "အင်တာနက်ချိတ်ဆက်မှုကို စစ်ပြီး ထပ်မံကြိုးစားပါ။"),
      });
      return false;
    }
  }, [serverBacked, toast, tx]);

  const startFromViewing = useCallback(async (viewingId: string) => {
    if (!serverBacked || !user) return null;
    try {
      const conversation = await messagesApi.createConversationFromViewing(viewingId);
      // Fold the new or reused conversation into the local list so the CRM
      // immediately shows a thread row.
      const viewerId = user.id;
      setConversations((current) => {
        const mapped = toUserConversation(conversation, viewerId);
        const existing = current.findIndex((item) => item.id === mapped.id);
        if (existing >= 0) return current.map((item, index) => index === existing ? { ...mapped, thread: item.thread.length ? item.thread : mapped.thread } : item);
        return [mapped, ...current];
      });
      return conversation.id;
    } catch (error) {
      toast({
        tone: "error",
        title: tx("Could not open a thread with this seeker", "ဤရှာဖွေသူနှင့် စာပြောဆိုမှုကို ဖွင့်မရပါ"),
        description: error instanceof ApiError && error.needsEmailVerification
          ? tx("Confirm your email address first, then try again.", "သင့်အီးမေးလ်လိပ်စာကို အရင်အတည်ပြုပြီးမှ ထပ်မံကြိုးစားပါ။")
          : tx("Check your connection and try again.", "အင်တာနက်ချိတ်ဆက်မှုကို စစ်ပြီး ထပ်မံကြိုးစားပါ။"),
      });
      return null;
    }
  }, [serverBacked, user, toast, tx]);

  return { conversations, ready, failed, refresh, serverBacked, loadThread, markRead, sendReply, startFromViewing };
}
