import { apiRequest } from "./client";

export interface ModelInfo {
  id: string;
  label: string;
}

export interface ConversationListItem {
  id: string;
  title: string;
  model: string | null;
  updated_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  created_at: string;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed." }));
    throw new Error(err.detail);
  }
  return res.json();
}

export const chatApi = {
  listModels: () => apiRequest("/chats/models").then((r) => handle<ModelInfo[]>(r)),

  listConversations: () => apiRequest("/chats").then((r) => handle<ConversationListItem[]>(r)),

  createConversation: () =>
    apiRequest("/chats", { method: "POST" }).then((r) => handle<ConversationListItem>(r)),

  getConversation: (id: string) =>
    apiRequest(`/chats/${id}`).then((r) =>
      handle<{ id: string; title: string; model: string | null; messages: Message[] }>(r)
    ),

  deleteConversation: (id: string) => apiRequest(`/chats/${id}`, { method: "DELETE" }),
};