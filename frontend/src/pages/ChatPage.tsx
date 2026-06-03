import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { ChatWindow } from "../components/chat/ChatWindow";
import { ChatInput } from "../components/chat/ChatInput";
import { useWs } from "../hooks/useWs";
import { ChatMessage } from "../types/models";

// Handles ChatPage logic.
export const ChatPage = () => {
  const qc = useQueryClient();
  const [sessionId] = useState("main");
  const [streamingReply, setStreamingReply] = useState("");

  const messagesQuery = useQuery({
    queryKey: ["chat", sessionId],
    queryFn: async () =>
      (await api.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`)).data
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => api.post("/chat/messages", { sessionId, message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", sessionId] })
  });

  const onWsMessage = useCallback((payload: unknown) => {
    const data = payload as { type?: string; sessionId?: string; chunk?: string };
    if (data.sessionId !== sessionId) return;
    if (data.type === "chat:chunk") setStreamingReply((prev) => prev + (data.chunk || ""));
    if (data.type === "chat:done") {
      setStreamingReply("");
      qc.invalidateQueries({ queryKey: ["chat", sessionId] });
    }
  }, [qc, sessionId]);

  const wsRef = useWs(onWsMessage);

  // Handles onSend logic.
  const onSend = (message: string) => {
    setStreamingReply("");
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "chat:send", sessionId, message }));
      return;
    }
    sendMutation.mutate(message);
  };

  const mergedMessages = useMemo(() => {
    const base = messagesQuery.data || [];
    if (!streamingReply) return base;
    return [...base, { id: "streaming", role: "assistant", content: streamingReply } as ChatMessage];
  }, [messagesQuery.data, streamingReply]);

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["chat", sessionId] });
  }, [qc, sessionId]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">AI Chat</h2>
      <ChatWindow messages={mergedMessages} />
      <ChatInput onSend={onSend} />
    </div>
  );
};
