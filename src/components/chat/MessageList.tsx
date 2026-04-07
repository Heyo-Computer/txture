import { useEffect, useRef } from "preact/hooks";
import { MessageBubble } from "./MessageBubble";
import type { AgentMessage } from "../../types";

interface MessageListProps {
  messages: AgentMessage[];
  loading: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  return (
    <div class="chat-messages">
      {messages.length === 0 && !loading && (
        <div class="chat-empty-hint">Ask the agent anything...</div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {loading && (
        <div class="chat-bubble assistant">
          <span style={{ opacity: 0.5 }}>Thinking...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
