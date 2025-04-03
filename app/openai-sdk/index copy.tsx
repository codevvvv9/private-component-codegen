'use client';

import { ChatMessages } from "../components/ChatMessages";
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Message } from '../components/ChatMessages/interface';

const Home = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messageImgUrl, setMessageImgUrl] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: input
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // 添加助手消息占位
    const assistantMessage: Message = {
      id: nanoid(),
      role: 'assistant',
      content: '',
      ragDocs: []
    };
    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: [...messages, userMessage].map(({ role, content }) => ({
            role,
            content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('网络请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      // 用于存储完整的响应内容
      let fullContent = '';
      let references: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 将 Uint8Array 转换为字符串
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            // data: 后的内容, 应该是6个字符
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                // 更新消息
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: fullContent, ragDocs: parsed.references }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error('解析响应数据失败:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('请求失败:', error);
      // 更新错误消息
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessage.id
            ? { ...msg, content: '抱歉，发生了错误。请稍后重试。' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = (messageId: string) => {
    // 找到要重试的消息及其前一条消息
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex < 1) return; // 确保有前一条消息

    // 重新发送从用户消息开始到当前消息的对话
    const messagesToRetry = messages.slice(0, messageIndex + 1);
    setMessages(messagesToRetry);
    const fakeEvent = { preventDefault: () => { } } as React.FormEvent<HTMLFormElement>;
    onSubmit(fakeEvent);
  };

  return (
    <ChatMessages
      messages={messages}
      input={input}
      handleInputChange={handleInputChange}
      onSubmit={onSubmit}
      isLoading={isLoading}
      messageImgUrl={messageImgUrl}
      setMessagesImgUrl={setMessageImgUrl}
      onRetry={handleRetry}
    />
  );
};

export default Home;
