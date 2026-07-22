import type { Message } from "@/lib/api/chat";

export type SocketStatus = "idle" | "connecting" | "open" | "reconnecting" | "closed" | "error";

interface ChatSocketCallbacks {
  onToken: (chunk: string) => void;
  onDone: (payload: { assistant_message: Message; conversation_title: string }) => void;
  onError: (detail: string) => void;
  onStatusChange: (status: SocketStatus) => void;
}

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:7171/api/v1";
const MAX_RECONNECT_ATTEMPTS = 5;
const FLUSH_INTERVAL_MS = 50; // caps UI updates to ~20/sec regardless of token arrival rate

export class ChatSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private manuallyClosed = false;
  private tokenBuffer = "";
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private conversationId: string,
    private authToken: string,
    private callbacks: ChatSocketCallbacks
  ) {}

  connect() {
    this.manuallyClosed = false;
    this.callbacks.onStatusChange(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");
    this.ws = new WebSocket(`${WS_BASE}/ws/chats/${this.conversationId}`);

    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({ type: "auth", token: this.authToken }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "auth_ok") {
        this.reconnectAttempts = 0;
        this.callbacks.onStatusChange("open");
      } else if (data.type === "token") {
        this.tokenBuffer += data.content;
        this.ensureFlushTimer();
      } else if (data.type === "done") {
        this.flushNow();
        this.stopFlushTimer();
        this.callbacks.onDone(data);
      } else if (data.type === "error") {
        this.flushNow();
        this.stopFlushTimer();
        this.callbacks.onError(data.detail);
      }
    };

    this.ws.onclose = (event) => {
      this.stopFlushTimer();
      if (this.manuallyClosed) {
        this.callbacks.onStatusChange("closed");
        return;
      }
      if (event.code >= 4000) {
        this.callbacks.onError(event.reason || "Connection rejected");
        this.callbacks.onStatusChange("error");
        return;
      }
      this.attemptReconnect();
    };
  }

  private ensureFlushTimer() {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flushNow(), FLUSH_INTERVAL_MS);
  }

  private flushNow() {
    if (this.tokenBuffer.length === 0) return;
    const chunk = this.tokenBuffer;
    this.tokenBuffer = "";
    this.callbacks.onToken(chunk);
  }

  private stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.callbacks.onStatusChange("error");
      this.callbacks.onError("Unable to reconnect. Please reload the page.");
      return;
    }
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
    setTimeout(() => this.connect(), delay);
  }

  sendMessage(content: string, model: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "message", content, model }));
    }
  }

  close() {
    this.manuallyClosed = true;
    this.stopFlushTimer();
    this.ws?.close();
  }
}