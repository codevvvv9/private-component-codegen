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
      let buffer = '';
      const dataRegex = /data: ({.+?})\n\n/g;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 将新的数据块添加到缓冲区
        buffer += new TextDecoder().decode(value);

        // 从缓冲区中提取完整的 SSE 消息
        let match;
        while ((match = dataRegex.exec(buffer)) !== null) {
          const data = match[1];
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

        // 保留未匹配完的数据
        const lastNewlineIndex = buffer.lastIndexOf('\n\n');
        if (lastNewlineIndex > -1) {
          buffer = buffer.slice(lastNewlineIndex + 2);
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
