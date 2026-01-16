'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { PlanningToolbar } from './PlanningToolbar';
import { PrdPreviewModal } from './PrdPreviewModal';
import { ExecutionProgress } from './ExecutionProgress';
import { useSoundEffect } from '../../lib/sounds/useSoundEffect';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface PRD {
  id: string;
  filename: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  estimatedIterations: number;
  path?: string;
}

interface GeneratedPlan {
  title: string;
  summary: string;
  prds: PRD[];
  estimatedComplexity: 'simple' | 'medium' | 'complex';
  suggestedOrder: number[];
  generatedAt?: string;
}

interface PlanningChatProps {
  instanceId: string;
  instanceName: string;
  instancePath: string;
  existingPrds?: string[];
  skills?: string[];
  onStartWork?: () => void;
  initialConversationId?: string;
  initialMessages?: Message[];
}

// Generate a simple UUID
function generateId(): string {
  return 'msg_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function PlanningChat({
  instanceId,
  instanceName,
  instancePath,
  existingPrds = [],
  skills = [],
  onStartWork,
  initialConversationId,
  initialMessages = [],
}: PlanningChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDraftingPrd, setIsDraftingPrd] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [showPrdPreview, setShowPrdPreview] = useState(false);
  const [showExecutionProgress, setShowExecutionProgress] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { play } = useSoundEffect();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      setError(null);
      setIsLoading(true);

      // Add user message immediately
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setStreamingContent('');

      try {
        const response = await fetch('/api/planning/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instanceId,
            instancePath,
            message: content,
            conversationId,
            context: {
              instanceName,
              existingPrds,
              skills,
              previousMessages: messages.slice(-20), // Include last 20 messages for context
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('API error response:', errorData);
          throw new Error(errorData.error || 'Failed to send message');
        }

        console.log('Response headers:', Object.fromEntries(response.headers));

        // Handle streaming response
        if (response.headers.get('content-type')?.includes('text/event-stream')) {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let fullContent = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    // Final message
                    continue;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.conversationId) {
                      setConversationId(parsed.conversationId);
                    }
                    if (parsed.content) {
                      fullContent += parsed.content;
                      setStreamingContent(fullContent);
                    }
                  } catch {
                    // Not JSON, might be raw content
                    fullContent += data;
                    setStreamingContent(fullContent);
                  }
                }
              }
            }
          }

          // Add assistant message when streaming is complete
          if (fullContent) {
            const assistantMessage: Message = {
              id: generateId(),
              role: 'assistant',
              content: fullContent,
              timestamp: new Date().toISOString(),
            };
            console.log('Adding assistant message:', assistantMessage);
            setMessages((prev) => {
              const updated = [...prev, assistantMessage];
              console.log('Updated messages:', updated);
              return updated;
            });
            setStreamingContent('');
          } else {
            console.warn('No content received from Claude');
          }
        } else {
          // Non-streaming response
          const data = await response.json();
          if (data.conversationId) {
            setConversationId(data.conversationId);
          }
          const assistantMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: data.reply,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        console.error('Chat error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [instanceId, instancePath, instanceName, existingPrds, skills, conversationId, messages]
  );

  const handleSave = useCallback(async () => {
    if (messages.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/planning/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          instancePath,
          conversationId,
          messages,
          title: `Planning session - ${new Date().toLocaleDateString()}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save conversation');
      }

      const data = await response.json();
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [instanceId, instancePath, conversationId, messages]);

  const handleDraftPrd = useCallback(async () => {
    if (messages.length === 0) return;

    setIsDraftingPrd(true);
    try {
      const response = await fetch('/api/planning/draft-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          instancePath,
          conversationId,
          messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to draft PRD');
      }

      const data = await response.json();
      // Show the drafted PRD as a message
      const prdMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `I've drafted a PRD based on our conversation:\n\n---\n\n${data.prd}\n\n---\n\nThis PRD has been saved to \`${data.filename}\`. Would you like me to refine it further?`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, prdMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draft PRD');
    } finally {
      setIsDraftingPrd(false);
    }
  }, [instanceId, instancePath, conversationId, messages]);

  const handleExport = useCallback(() => {
    if (messages.length === 0) return;

    // Generate markdown export
    let markdown = `# Planning Conversation: ${instanceName}\n\n`;
    markdown += `**Instance:** ${instanceName}\n`;
    markdown += `**Date:** ${new Date().toLocaleString()}\n`;
    if (conversationId) {
      markdown += `**Conversation ID:** ${conversationId}\n`;
    }
    markdown += '\n---\n\n';

    for (const msg of messages) {
      const role = msg.role === 'user' ? '**You**' : '**Claude**';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      markdown += `### ${role} (${time})\n\n${msg.content}\n\n---\n\n`;
    }

    // Download as file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planning-${instanceName}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages, instanceName, conversationId]);

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
    setError(null);
    setStreamingContent('');
  }, []);

  const handleStartWork = useCallback(() => {
    if (onStartWork) {
      onStartWork();
    }
  }, [onStartWork]);

  // Generate plan from conversation
  const handleGeneratePlan = useCallback(async () => {
    if (messages.length < 2) {
      setError('Please have a conversation first before generating a plan');
      return;
    }

    setIsGeneratingPlan(true);
    setError(null);

    try {
      const response = await fetch('/api/planning/generate-prds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instancePath,
          conversationId,
          messages,
          userRequest: 'Generate PRDs based on our planning conversation',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate plan');
      }

      const data = await response.json();
      if (data.success && data.plan) {
        setGeneratedPlan(data.plan);
        setShowPrdPreview(true);
        play('success');

        // Add success message to chat
        const planMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: `I've generated a plan with ${data.plan.prds.length} PRD${data.plan.prds.length !== 1 ? 's' : ''} based on our conversation:\n\n**${data.plan.title}**\n\n${data.plan.summary}\n\nClick "View Plan" in the toolbar to review and start implementation.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, planMessage]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan');
      play('error');
      console.error('Generate plan error:', err);
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [instancePath, conversationId, messages, play]);

  // Execute the generated plan
  const handleExecutePlan = useCallback(async () => {
    if (!generatedPlan) return;

    try {
      const response = await fetch('/api/planning/execute-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instancePath,
          workerModel: 'opus',
          managerModel: 'opus',
          maxIterations: 999999,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start execution');
      }

      const data = await response.json();
      if (data.success) {
        setShowPrdPreview(false);
        setShowExecutionProgress(true);
        play('start');

        // Add execution message to chat
        const execMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: `Implementation has started! 🚀\n\nCurrently working on: **${data.execution?.currentPrd || generatedPlan.prds[0]?.filename}**\n\nYou can monitor progress in the execution panel.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, execMessage]);

        // Call onStartWork if provided
        if (onStartWork) {
          onStartWork();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start execution');
      play('error');
      console.error('Execute plan error:', err);
    }
  }, [generatedPlan, instancePath, onStartWork, play]);

  // Edit a PRD in the plan
  const handleEditPrd = useCallback(async (prdId: string, content: string) => {
    try {
      const response = await fetch('/api/planning/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instancePath,
          prdId,
          content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update PRD');
      }

      // Refresh the plan
      const refreshResponse = await fetch(
        `/api/planning/review?instancePath=${encodeURIComponent(instancePath)}`
      );
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.success && refreshData.plan) {
          setGeneratedPlan(refreshData.plan);
        }
      }
    } catch (err) {
      throw err;
    }
  }, [instancePath]);

  // Refresh plan from server
  const handleRefreshPlan = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/planning/review?instancePath=${encodeURIComponent(instancePath)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.plan) {
          setGeneratedPlan(data.plan);
        }
      }
    } catch (err) {
      console.error('Failed to refresh plan:', err);
    }
  }, [instancePath]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Chat header - hidden on mobile since page header shows info */}
      <div className="hidden sm:block border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Planning Mode</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              Discuss requirements and plan implementation for {instanceName}
            </p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-3 sm:mx-4 mt-3 sm:mt-4 p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs sm:text-sm text-red-700 dark:text-red-300 flex-1 line-clamp-2">{error}</span>
            <button onClick={() => setError(null)} className="flex-shrink-0 text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
        {messages.length === 0 && !streamingContent && (
          <div className="flex flex-col items-center justify-center h-full text-center px-2">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-3 sm:mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Start Planning</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-4 sm:mb-6">
              Describe what you want to build. I'll help you clarify requirements, discuss approaches, and draft a PRD.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-lg">
              <SuggestionButton onClick={() => handleSendMessage("I want to build a new feature. Let's discuss the requirements.")}>
                New feature
              </SuggestionButton>
              <SuggestionButton onClick={() => handleSendMessage("Help me plan the implementation for my project.")}>
                Plan work
              </SuggestionButton>
              <SuggestionButton onClick={() => handleSendMessage("What's the best approach for building this?")}>
                Discuss approach
              </SuggestionButton>
              <SuggestionButton onClick={() => handleSendMessage("Let's create a PRD for my idea.")}>
                Create PRD
              </SuggestionButton>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
          />
        ))}

        {/* Streaming message */}
        {streamingContent && (
          <MessageBubble role="assistant" content={streamingContent} isStreaming={true} />
        )}

        {/* Loading indicator when waiting for response */}
        {isLoading && !streamingContent && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder="Describe what you want to build..."
      />

      {/* Toolbar */}
      <PlanningToolbar
        instanceName={instanceName}
        conversationId={conversationId}
        onSave={handleSave}
        onDraftPrd={handleDraftPrd}
        onStartWork={handleStartWork}
        onExport={handleExport}
        onNewConversation={handleNewConversation}
        onGeneratePlan={handleGeneratePlan}
        onViewPlan={generatedPlan ? () => setShowPrdPreview(true) : undefined}
        isSaving={isSaving}
        isDraftingPrd={isDraftingPrd}
        isGeneratingPlan={isGeneratingPlan}
        hasMessages={messages.length > 0}
        hasPlan={!!generatedPlan}
      />

      {/* PRD Preview Modal */}
      {generatedPlan && (
        <PrdPreviewModal
          isOpen={showPrdPreview}
          plan={generatedPlan}
          instancePath={instancePath}
          onClose={() => setShowPrdPreview(false)}
          onExecute={handleExecutePlan}
          onEdit={handleEditPrd}
          onRefresh={handleRefreshPlan}
        />
      )}

      {/* Execution Progress */}
      <ExecutionProgress
        instancePath={instancePath}
        isVisible={showExecutionProgress}
        onClose={() => setShowExecutionProgress(false)}
      />
    </div>
  );
}

// Suggestion button component
function SuggestionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl
        bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
        hover:bg-gray-200 dark:hover:bg-gray-700
        border border-gray-200 dark:border-gray-700
        transition-colors"
    >
      {children}
    </button>
  );
}
