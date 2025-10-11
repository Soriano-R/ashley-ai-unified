# Ashley AI Chatbot Tutorial - Part 4: Frontend Development with Next.js

## Overview

In this part, we'll build the complete Next.js frontend for Ashley AI. This includes creating beautiful React components, implementing the chat interface, authentication, and connecting everything to our Python backend.

## Frontend Architecture Setup

### Step 1: Create Global Styles

Create `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.0%;
    --radius: 0.75rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer components {
  .chat-message {
    @apply max-w-none prose prose-invert prose-sm;
  }
  
  .chat-message pre {
    @apply bg-slate-800 border border-slate-700 rounded-lg p-4 overflow-x-auto;
  }
  
  .chat-message code {
    @apply bg-slate-800 px-1.5 py-0.5 rounded text-sm;
  }
  
  .chat-message p {
    @apply mb-4 leading-relaxed;
  }
  
  .chat-message ul, .chat-message ol {
    @apply mb-4 pl-6;
  }
  
  .chat-message li {
    @apply mb-2;
  }
}

/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgb(30 41 59);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgb(71 85 105);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgb(100 116 139);
}

/* Loading animation */
.loading-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.loading-dots::after {
  content: '';
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: currentColor;
  animation: loading-dots 1.4s infinite ease-in-out both;
}

.loading-dots::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: currentColor;
  animation: loading-dots 1.4s infinite ease-in-out both;
  animation-delay: -0.32s;
  margin-right: 4px;
}

@keyframes loading-dots {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Step 2: Create Root Layout

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ashley AI - Intelligent Assistant",
  description: "Your personal AI assistant powered by advanced language models",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        {children}
      </body>
    </html>
  );
}
```

## UI Components

### Step 1: Create Basic UI Components

Create `src/components/ui/button.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
            "bg-destructive text-destructive-foreground hover:bg-destructive/90": variant === "destructive",
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
            "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
            "text-primary underline-offset-4 hover:underline": variant === "link",
          },
          {
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
```

Create `src/components/ui/input.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

Create `src/components/ui/textarea.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
```

### Step 2: Create Utility Functions

Create `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDate(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInHours / 24;

  if (diffInHours < 24) {
    return formatTime(date);
  } else if (diffInDays < 7) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } else {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }
}

export function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
```

Create `src/lib/api.ts`:

```typescript
interface ChatMessage {
  message: string;
  persona: string;
  session_id: string;
}

interface ChatResponse {
  response: string;
  session_id: string;
  persona: string;
  tokens_used?: number;
  model?: string;
}

interface Session {
  session_id: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  messages: any[];
  metadata: any;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async sendMessage(message: ChatMessage): Promise<ChatResponse> {
    return this.request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(message),
    });
  }

  async createSession(userId?: string): Promise<{ session_id: string; created_at: string }> {
    return this.request("/sessions", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.request<Session>(`/sessions/${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<{ message: string }> {
    return this.request(`/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  async listSessions(userId?: string): Promise<{ sessions: Session[] }> {
    const params = userId ? `?user_id=${userId}` : "";
    return this.request<{ sessions: Session[] }>(`/sessions${params}`);
  }

  async getPersonas(): Promise<{ personas: string[] }> {
    return this.request<{ personas: string[] }>("/personas");
  }

  async checkHealth(): Promise<{ status: string; service: string; version: string }> {
    return this.request<{ status: string; service: string; version: string }>("/health");
  }
}

export const apiClient = new ApiClient();
export type { ChatMessage, ChatResponse, Session };
```

## Chat Components

### Step 1: Create Message Component

Create `src/components/chat/message.tsx`:

```tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import { User, Bot } from "lucide-react";

interface MessageProps {
  content: string;
  isUser: boolean;
  timestamp: Date;
  persona?: string;
}

export function Message({ content, isUser, timestamp, persona }: MessageProps) {
  return (
    <div className={cn("flex gap-3 p-4", isUser && "flex-row-reverse")}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-secondary text-secondary-foreground"
      )}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      
      <div className={cn("flex-1 space-y-2", isUser && "flex-col items-end")}>
        <div className={cn(
          "max-w-[80%] rounded-lg p-3",
          isUser 
            ? "bg-primary text-primary-foreground ml-auto" 
            : "bg-muted text-muted-foreground"
        )}>
          <div className="chat-message">
            <p className="mb-0 whitespace-pre-wrap">{content}</p>
          </div>
        </div>
        
        <div className={cn(
          "text-xs text-muted-foreground flex items-center gap-2",
          isUser && "justify-end"
        )}>
          <span>{formatTime(timestamp)}</span>
          {!isUser && persona && (
            <>
              <span>•</span>
              <span>{persona}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Create Chat Input Component

Create `src/components/chat/chat-input.tsx`:

```tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message..." 
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-background p-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[60px] max-h-[120px] resize-none"
            rows={1}
          />
        </div>
        
        <Button
          type="submit"
          disabled={disabled || !message.trim()}
          size="icon"
          className="h-[60px] w-12 flex-shrink-0"
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
```

### Step 3: Create Chat Interface Component

Create `src/components/chat/chat-interface.tsx`:

```tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Message } from "./message";
import { ChatInput } from "./chat-input";
import { Button } from "@/components/ui/button";
import { apiClient, type ChatMessage as APIChatMessage } from "@/lib/api";
import { generateSessionId } from "@/lib/utils";
import { Trash2, RotateCcw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  persona?: string;
}

interface ChatInterfaceProps {
  persona: string;
  onSettingsClick?: () => void;
}

export function ChatInterface({ persona, onSettingsClick }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await apiClient.createSession();
        setSessionId(response.session_id);
      } catch (error) {
        console.error("Failed to create session:", error);
        // Fallback to client-side session ID
        setSessionId(generateSessionId());
      }
    };

    initSession();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError("");

    try {
      const apiMessage: APIChatMessage = {
        message: content,
        persona: persona,
        session_id: sessionId,
      };

      const response = await apiClient.sendMessage(apiMessage);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        isUser: false,
        timestamp: new Date(),
        persona: response.persona,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      setError(error instanceof Error ? error.message : "Failed to send message");
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble processing your message right now. Please try again.",
        isUser: false,
        timestamp: new Date(),
        persona: persona,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    try {
      if (sessionId) {
        await apiClient.deleteSession(sessionId);
      }
      
      // Create new session
      const response = await apiClient.createSession();
      setSessionId(response.session_id);
      setMessages([]);
      setError("");
    } catch (error) {
      console.error("Failed to clear chat:", error);
      // Still clear the UI even if API call fails
      setMessages([]);
      setSessionId(generateSessionId());
    }
  };

  const handleRetry = () => {
    setError("");
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div>
            <h2 className="font-semibold text-card-foreground">Ashley AI</h2>
            <p className="text-sm text-muted-foreground">Persona: {persona}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onSettingsClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearChat}
            className="h-8 w-8"
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 p-3 flex items-center justify-between">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            className="text-destructive hover:text-destructive"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center p-8">
            <div className="max-w-md">
              <h3 className="text-lg font-medium text-foreground mb-2">
                Welcome to Ashley AI
              </h3>
              <p className="text-muted-foreground mb-4">
                I'm here to help you with questions, coding, creative writing, and more. 
                What would you like to talk about?
              </p>
              <div className="text-sm text-muted-foreground">
                Current persona: <span className="font-medium text-foreground">{persona}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {messages.map((message) => (
              <Message
                key={message.id}
                content={message.content}
                isUser={message.isUser}
                timestamp={message.timestamp}
                persona={message.persona}
              />
            ))}
            
            {isLoading && (
              <div className="flex gap-3 p-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                </div>
                <div className="flex-1">
                  <div className="bg-muted text-muted-foreground max-w-[80%] rounded-lg p-3">
                    <div className="loading-dots">Thinking</div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        placeholder={`Message ${persona}...`}
      />
    </div>
  );
}
```

## Authentication Components

### Step 1: Create Sign-In Component

Create `src/components/auth/sign-in.tsx`:

```tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

interface SignInProps {
  onSignIn: (credentials: { email: string; password: string }) => void;
  isLoading?: boolean;
  error?: string;
}

export function SignIn({ onSignIn, isLoading = false, error }: SignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold text-primary-foreground">A</span>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to Ashley AI</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                disabled={isLoading}
              />
              <span className="text-sm text-muted-foreground">Remember me</span>
            </label>

            <button
              type="button"
              className="text-sm text-primary hover:underline"
              disabled={isLoading}
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full h-12"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Don't have an account?{" "}
            <button className="text-primary hover:underline font-medium">
              Contact administrator
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
```

## Main Application Page

### Step 1: Create Home Page

Create `src/app/page.tsx`:

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat/chat-interface";
import { SignIn } from "@/components/auth/sign-in";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { Settings, User, LogOut } from "lucide-react";

interface User {
  email: string;
  name?: string;
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentPersona, setCurrentPersona] = useState("Ashley");
  const [availablePersonas, setAvailablePersonas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Load personas on component mount
  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const response = await apiClient.getPersonas();
        setAvailablePersonas(response.personas);
      } catch (error) {
        console.error("Failed to load personas:", error);
        // Fallback personas
        setAvailablePersonas(["Ashley", "Technical", "Creative"]);
      }
    };

    loadPersonas();
  }, []);

  const handleSignIn = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    setAuthError("");

    try {
      // Simulate authentication - in real app, call your auth API
      // For demo purposes, accept any email/password
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUser({ 
        email: credentials.email,
        name: credentials.email.split("@")[0] 
      });
      setIsAuthenticated(true);
    } catch (error) {
      setAuthError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setUser(null);
    setAuthError("");
  };

  if (!isAuthenticated) {
    return (
      <SignIn
        onSignIn={handleSignIn}
        isLoading={isLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">A</span>
          </div>
          <div>
            <h1 className="font-semibold text-card-foreground">Ashley AI</h1>
            <p className="text-xs text-muted-foreground">Intelligent Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Persona Selector */}
          <select
            value={currentPersona}
            onChange={(e) => setCurrentPersona(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {availablePersonas.map((persona) => (
              <option key={persona} value={persona}>
                {persona}
              </option>
            ))}
          </select>

          {/* Settings Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <span className="text-sm text-foreground hidden sm:inline">
              {user?.name || user?.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b border-border bg-muted p-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="font-medium text-foreground mb-3">Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="block text-muted-foreground mb-1">Current Persona</label>
                <p className="text-foreground font-medium">{currentPersona}</p>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">User</label>
                <p className="text-foreground font-medium">{user?.email}</p>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">Status</label>
                <p className="text-green-600 font-medium">Connected</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <main className="flex-1 overflow-hidden">
        <ChatInterface
          persona={currentPersona}
          onSettingsClick={() => setShowSettings(!showSettings)}
        />
      </main>
    </div>
  );
}
```

## Testing the Frontend

### Step 1: Start Development Servers

First, ensure your Python backend is running:

```bash
cd python-service
source ../chatbot_env/bin/activate
python main.py
```

In another terminal, start the Next.js frontend:

```bash
# From project root
npm run dev:next
```

### Step 2: Test the Application

1. Open your browser to `http://localhost:3000`
2. You should see the sign-in page
3. Enter any email and password (demo mode)
4. After signing in, you should see the chat interface
5. Try sending a message to test the full integration

### Step 3: Test Features

Test the following features:
- Authentication flow
- Chat messaging
- Persona switching
- Settings panel
- Chat clearing
- Responsive design

## Next Steps

Congratulations! You now have a fully functional frontend for Ashley AI. In the next part of this tutorial, we'll:
- Integrate and test the complete application
- Add advanced features and optimizations
- Prepare for deployment
- Create comprehensive testing suites

Continue to **TUTORIAL_05_INTEGRATION_TESTING.md** to proceed with integration and testing.

## Troubleshooting

### Common Frontend Issues

**API Connection Issues**:
- Verify the Python backend is running on port 8001
- Check CORS settings in the backend
- Ensure `NEXT_PUBLIC_API_URL` is set correctly in `.env`

**Styling Issues**:
- Verify Tailwind CSS is properly configured
- Check that all CSS imports are correct
- Ensure the `dark` class is applied to the HTML element

**Build Errors**:
- Ensure all TypeScript types are properly defined
- Check that all imports are correct
- Verify Next.js configuration is valid