import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { ChatWindow } from "../components/chat/ChatWindow";
import { ChatInput } from "../components/chat/ChatInput";
import { EmptyState, ErrorState, LoadingState, getErrorMessage } from "../components/ui/Status";
import { useWs } from "../hooks/useWs";
import { ChatMessage } from "../types/models";

// Handles ChatPage logic.
export const ChatPage = () => {
  const qc = useQueryClient();
  const [sessionId] = useState("main");
  const [streamingReply, setStreamingReply] = useState("");
  const [wsPending, setWsPending] = useState(false);

  const messagesQuery = useQuery({
    queryKey: ["chat", sessionId],
    queryFn: async () =>
      (await api.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`)).data
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => api.post("/chat/messages", { sessionId, message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", sessionId] })
  });

  // Handles onWsMessage logic.
  const onWsMessage = useCallback((payload: unknown) => {
    const data = payload as { type?: string; sessionId?: string; chunk?: string };
    if (data.sessionId !== sessionId) return;
    if (data.type === "chat:chunk") {
      setWsPending(false);
      setStreamingReply((prev) => prev + (data.chunk || ""));
    }
    if (data.type === "chat:done") {
      setWsPending(false);
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
      setWsPending(true);
      socket.send(JSON.stringify({ type: "chat:send", sessionId, message }));
      return;
    }
    sendMutation.mutate(message);
  };

  // Handles mergedMessages logic.
  const mergedMessages = useMemo(() => {
    const base = messagesQuery.data || [];
    if (!streamingReply) return base;
    return [...base, { id: "streaming", role: "assistant", content: streamingReply } as ChatMessage];
  }, [messagesQuery.data, streamingReply]);

  // Handles session refresh logic.
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["chat", sessionId] });
  }, [qc, sessionId]);

  const isSending = sendMutation.isPending || wsPending || Boolean(streamingReply);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">AI Chat</h2>
      {messagesQuery.isLoading && <LoadingState title="Loading conversation" />}
      {messagesQuery.isError && (
        <ErrorState title="Could not load chat" message={getErrorMessage(messagesQuery.error)} />
      )}
      {sendMutation.isError && (
        <ErrorState title="Message failed" message={getErrorMessage(sendMutation.error)} />
      )}
      {messagesQuery.isSuccess && mergedMessages.length === 0 && (
        <EmptyState title="No messages yet" message="Ask a question to start a workspace-aware chat." />
      )}
      {mergedMessages.length > 0 && <ChatWindow messages={mergedMessages} />}
      {wsPending && <LoadingState title="Thinking" message="Retrieving workspace context and calling the LLM." />}
      <ChatInput isPending={isSending} onSend={onSend} />
    </div>
  );
};
