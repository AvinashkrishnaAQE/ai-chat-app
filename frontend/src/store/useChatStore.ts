import { create } from "zustand";
import { chatApi, ConversationListItem, Message, ModelInfo } from "@/lib/api/chat";
import { ChatSocket, SocketStatus } from "@/lib/ws/chatSocket";
import { useAuthStore } from "./useAuthStore";

let activeSocket: ChatSocket | null = null;

interface ChatState {
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  messagesByConversation: Record<string, Message[]>;
  streamingContent: string;
  isStreaming: boolean;
  connectionStatus: SocketStatus;
  connectionError: string | null;
  loadingConversations: boolean;
  loadingMessages: boolean;
  availableModels: ModelInfo[];
  selectedModel: string;
  modelsRequested: boolean;
  draftInput: string;
  pendingFirstMessage: string | null;

  loadModels: () => Promise<void>;
  setSelectedModel: (modelId: string) => void;
  setDraftInput: (value: string) => void;
  loadConversations: () => Promise<void>;
  startNewConversation: (firstMessage?: string) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => void;
  deleteConversation: (id: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messagesByConversation: {},
  streamingContent: "",
  isStreaming: false,
  connectionStatus: "idle",
  connectionError: null,
  loadingConversations: false,
  loadingMessages: false,
  availableModels: [],
  selectedModel: "",
  modelsRequested: false,
  draftInput: "",
  pendingFirstMessage: null,

  loadModels: async () => {
    if (get().modelsRequested) return;
    set({ modelsRequested: true });
    const models = await chatApi.listModels();
    set({ availableModels: models, selectedModel: get().selectedModel || models[0]?.id || "" });
  },

  setSelectedModel: (modelId: string) => set({ selectedModel: modelId }),
  setDraftInput: (value: string) => set({ draftInput: value }),

  loadConversations: async () => {
    set({ loadingConversations: true });
    try {
      const conversations = await chatApi.listConversations();
      set({ conversations });
    } finally {
      set({ loadingConversations: false });
    }
  },

  startNewConversation: async (firstMessage?: string) => {
    const conversation = await chatApi.createConversation();
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      messagesByConversation: { ...state.messagesByConversation, [conversation.id]: [] },
      pendingFirstMessage: firstMessage ?? null,
      draftInput: "",
    }));
    await get().selectConversation(conversation.id);
  },

  selectConversation: async (id: string) => {
    activeSocket?.close();
    activeSocket = null;
    set({
      activeConversationId: id,
      streamingContent: "",
      isStreaming: false,
      connectionStatus: "idle",
      connectionError: null,
    });

    if (!get().messagesByConversation[id]) {
      set({ loadingMessages: true });
      try {
        const detail = await chatApi.getConversation(id);
        set((state) => ({
          messagesByConversation: { ...state.messagesByConversation, [id]: detail.messages },
          selectedModel: detail.model || state.selectedModel,
        }));
      } finally {
        set({ loadingMessages: false });
      }
    }

    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) return;

    activeSocket = new ChatSocket(id, accessToken, {
      onToken: (chunk) => set((state) => ({ streamingContent: state.streamingContent + chunk })),
      onDone: ({ assistant_message, conversation_title }) => {
        set((state) => {
          const existing = state.messagesByConversation[id] ?? [];
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [id]: [...existing, assistant_message],
            },
            streamingContent: "",
            isStreaming: false,
            conversations: state.conversations
              .map((c) =>
                c.id === id
                  ? { ...c, title: conversation_title, updated_at: assistant_message.created_at }
                  : c
              )
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
          };
        });
      },
      onError: (detail) => set({ connectionError: detail, isStreaming: false, streamingContent: "" }),
      onStatusChange: (status) => {
        set({ connectionStatus: status });
        if (status === "open") {
          const pending = get().pendingFirstMessage;
          if (pending) {
            set({ pendingFirstMessage: null });
            get().sendMessage(pending);
          }
        }
      },
    });
    activeSocket.connect();
  },

  sendMessage: (content: string) => {
    const { activeConversationId, messagesByConversation, selectedModel } = get();
    if (!activeConversationId || !activeSocket) return;

    const optimisticUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      model: null,
      created_at: new Date().toISOString(),
    };
    const existing = messagesByConversation[activeConversationId] ?? [];
    set({
      messagesByConversation: {
        ...messagesByConversation,
        [activeConversationId]: [...existing, optimisticUserMsg],
      },
      isStreaming: true,
      streamingContent: "",
      connectionError: null,
      draftInput: "",
    });

    activeSocket.sendMessage(content, selectedModel);
  },

  deleteConversation: async (id: string) => {
    await chatApi.deleteConversation(id);
    if (get().activeConversationId === id) {
      activeSocket?.close();
      activeSocket = null;
    }
    set((state) => {
      const { [id]: _, ...rest } = state.messagesByConversation;
      return {
        conversations: state.conversations.filter((c) => c.id !== id),
        messagesByConversation: rest,
        activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
      };
    });
  },
}));