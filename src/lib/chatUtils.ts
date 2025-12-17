// Chat utility functions

export interface Conversation {
  id: string;
  title: string;
  messages: any[];
  createdAt: Date;
  updatedAt: Date;
  bookmarked?: boolean;
}

// Generate conversation title from first message
export function generateConversationTitle(firstMessage: string): string {
  const words = firstMessage.split(" ").slice(0, 5).join(" ");
  return words.length > 30 ? words.substring(0, 30) + "..." : words;
}

// Generate related questions based on message content
export function generateRelatedQuestions(messageContent: string, messageRole: "user" | "assistant"): string[] {
  if (messageRole === "user") return [];

  const questions: string[] = [];
  const content = messageContent.toLowerCase();

  if (content.includes("document")) {
    questions.push("What documents do I need?");
    questions.push("How do I prepare my documents?");
  }
  if (content.includes("visa") && content.includes("student")) {
    questions.push("What are the requirements for a student visa?");
    questions.push("How long does a student visa take?");
  }
  if (content.includes("visa") && content.includes("tourist")) {
    questions.push("What are the requirements for a tourist visa?");
    questions.push("How long can I stay on a tourist visa?");
  }
  if (content.includes("financial") || content.includes("fund")) {
    questions.push("How much money do I need to show?");
    questions.push("What counts as financial proof?");
  }
  if (content.includes("reject") || content.includes("deny")) {
    questions.push("What should I do if my visa is rejected?");
    questions.push("Can I reapply after rejection?");
  }

  return questions.slice(0, 3);
}

// Extract rich content from message (mock implementation)
export function extractRichContent(messageContent: string): any {
  const content = messageContent.toLowerCase();

  // Check for comparison table
  if (content.includes("compare") || content.includes("difference")) {
    return {
      type: "table",
      data: {
        headers: ["Feature", "Student Visa", "Tourist Visa"],
        rows: [
          ["Duration", "Up to 4 years", "Up to 6 months"],
          ["Work Permit", "Yes (on-campus)", "No"],
          ["Financial Proof", "Required", "Required"],
          ["Study Required", "Yes", "No"],
        ],
      },
    };
  }

  // Check for timeline
  if (content.includes("process") || content.includes("timeline") || content.includes("step")) {
    return {
      type: "timeline",
      data: {
        steps: [
          { title: "Submit Application", description: "Complete online form", duration: "1-2 days" },
          { title: "Document Review", description: "Officer reviews your documents", duration: "2-4 weeks" },
          { title: "Interview", description: "Attend visa interview (if required)", duration: "1 day" },
          { title: "Decision", description: "Receive approval or rejection", duration: "1-2 weeks" },
        ],
      },
    };
  }

  // Check for document ID
  if (content.includes("passport") && /\b[A-Z]{2}\d{6,8}\b/.test(messageContent)) {
    const match = messageContent.match(/\b[A-Z]{2}\d{6,8}\b/);
    if (match) {
      return {
        type: "code",
        data: {
          code: match[0],
        },
      };
    }
  }

  // Check for official links
  if (content.includes("official") || content.includes("website")) {
    return {
      type: "link",
      data: {
        url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html",
        title: "Official Canada Immigration Website",
      },
    };
  }

  return null;
}

// Generate conversation summary
export function generateConversationSummary(messages: any[]): string {
  if (messages.length === 0) return "No messages yet";
  if (messages.length === 1) return messages[0].content.substring(0, 100) + "...";

  const userMessages = messages.filter((m) => m.role === "user");
  const topics = userMessages.map((m) => m.content.split(" ").slice(0, 3).join(" "));
  return `Conversation about: ${topics.join(", ")}`;
}

// Search within conversations
export function searchInConversation(messages: any[], query: string): any[] {
  const lowerQuery = query.toLowerCase();
  return messages.filter(
    (m) =>
      m.content.toLowerCase().includes(lowerQuery) ||
      m.role.toLowerCase().includes(lowerQuery),
  );
}

// Export conversation to text
export function exportConversationToText(messages: any[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`)
    .join("\n\n");
}

// Export conversation to JSON
export function exportConversationToJSON(messages: any[]): string {
  return JSON.stringify(messages, null, 2);
}

