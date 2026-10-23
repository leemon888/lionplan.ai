"use client";

import { useChat, type UseChatHelpers } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import { createContext, useContext, useEffect } from "react";
import { addCourse, moveCourse, removeCourse, setManual, updateProfile, type OpResult } from "@/lib/plan-ops";
import { usePlanStore } from "@/lib/store";
import type { ClientToolName } from "@/lib/tools";
import type { Plan, Profile } from "@/lib/types";

type Chat = UseChatHelpers<UIMessage>;
const ChatContext = createContext<Chat | null>(null);

export function useLionChat() {
  const chat = useContext(ChatContext);
  if (!chat) throw new Error("useLionChat must be used inside <ChatProvider>");
  return chat;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const runners: Partial<Record<ClientToolName, (input: any) => (plan: Plan) => OpResult>> = {
  add_course: ({ code, termId }) => (p) => addCourse(p, code, termId),
  remove_course: ({ code }) => (p) => removeCourse(p, code),
  move_course: ({ code, termId }) => (p) => moveCourse(p, code, termId),
  update_profile: (patch: Partial<Profile>) => (p) => updateProfile(p, patch),
  set_requirement_done: ({ id, done }) => (p) => setManual(p, id, done),
};

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const chat = useChat({
    id: "lionplan",
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // Send the latest plan with every request so the AI always sees what's on screen.
      body: () => ({ plan: usePlanStore.getState().plan }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;
      if (toolCall.toolName === "show_courses") {
        // Cards render from the tool input; the student acts on them directly.
        chat.addToolOutput({ tool: "show_courses", toolCallId: toolCall.toolCallId, output: "Shown to the student as cards with Add and Already taken buttons." });
        return;
      }
      const run = runners[toolCall.toolName as ClientToolName];
      if (!run) return; // server-side tool
      const res = usePlanStore.getState().apply(run(toolCall.input));
      if (res?.ok) {
        const code = (toolCall.input as { code?: string })?.code;
        if (code && toolCall.toolName !== "remove_course") usePlanStore.getState().flashCourse(code.toUpperCase());
        chat.addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output: res.message });
      } else {
        chat.addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: res ? res.error : "No plan exists yet.",
        });
      }
    },
  });

  const pending = usePlanStore((s) => s.pendingMessage);
  useEffect(() => {
    if (!pending) return;
    usePlanStore.getState().setPendingMessage(null);
    if (usePlanStore.getState().chatMode === "closed") usePlanStore.getState().setChatMode("corner");
    chat.sendMessage({ text: pending });
  }, [pending, chat]);

  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}
