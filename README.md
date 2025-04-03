# private-component-codegen

基于私有组件的生成业务组件代码的 AI RAG 应用，分别使用了 OpenAI SDK、LangChain、LlamaIndex、Vercel AI SDK 来实现 RAG 功能。

## 项目架构

![项目技术架构](./public/atg.png)

## 技术栈

- Next.js
- Ant Design
- Tailwind CSS
- TypeScript
- Drizzle ORM
- PostgreSQL
- OpenAI SDK
- LangChain
- LlamaIndex
- Vercel AI SDK

## 项目目录结构

```bash
├── app
│ ├── api // api 路由
│ │ ├── openai
│ │ ├── langchain
│ │ ├── llamaindex
│ │ ├── vercelai
│ ├── components // 业务组件
│ ├── openai-sdk // 对接 OpenAI SDK 的 page
│ ├── langchain // 对接 LangChain 的 page
│ ├── llamaindex // 对接 LlamaIndex 的 page
│ ├── vercel-ai // 对接 Vercel AI 的 page
│ ├── page.tsx // 入口
├── lib
│ ├── db // 数据库
│ │ ├── openai
│ │ │ ├── schema.ts
│ │ │ ├── selectors.ts
│ │ │ ├── actions.ts
│ │ ├── vercelai
│ │ │ ├── schema.ts
│ │ │ ├── selectors.ts
│ │ │ ├── actions.ts
```

## 快速开始

### 配置环境变量

```bash
cp .env.template .env
```

编辑 `.env` 文件，配置环境变量

```bash
# 数据库连接字符串：从supabase中获取（https://supabase.com/）
DATABASE_URL=postgresql://
# 嵌入模型
EMBEDDING=text-embedding-ada-002
# 大模型 API Key
AI_KEY=sk-xxx
# 大模型 API Base URL
AI_BASE_URL=https://api
# 大模型
MODEL=gpt-4o
```

### 生成 embedding 的数据表

用下面的提示词，在 lib/db/openai/schema.ts 创建内容

```
使用 drizzle-orm/pg-core 创建一个 PostgreSQL 数据表 schema，用于存储 OpenAI embeddings。表名为 'open_ai_embeddings'，包含以下字段:

- id: 使用 nanoid 生成的主键，varchar(191) 类型
- content: 文本内容，text 类型，不允许为空
- embedding: 向量类型字段，维度为 1536，不允许为空

同时需要创建一个使用 HNSW 算法的向量索引，用于余弦相似度搜索。
```

然后执行

```bash
pnpm db:generate
```

会基于 drizzle.config.ts 生成迁移目录 lib/db/migrations

然后执行初始化数据库
pnpm db:migrate，在 supabase 上创建出来

执行 OpenAI Embedding 数据库的 action，也就是怎么把向量数据和向量数据的 chunk 存储到表里面

让 cursor agent composer 基于以下 prompt 生成代码：

```
创建一个 server action function，能够接收外部的数据源，保存到 db 中，function 入参是：embeddings: Array<{ embedding: number[]; content: string }>
```

放到 lib/db/openai/actions.ts 中

编写脚本，将私有组件知识库中的内容转换为 embeddings，并保存到数据库中

让 cursor agent composer 基于以下 prompt 生成代码：

```
使用 OpenAI SDK 创建一个函数，将输入的文本字符串转换为向量嵌入（embeddings）。支持将文本按特定分隔符分块处理，每个文本块都生成对应的 embedding 向量，并返回包含原文本和向量的结果数组。
```

放到 app/api/openai/embedding.ts 下，然后手写 app/api/openai/embedDocs.ts，启动它的文件.
添加脚本："openai:embedding": "tsx app/api/openai/embeddings.ts"

### RAG 应用逻辑

lib/db/openai/selectors.ts，使用提示词创建，查询相似度的：

```
创建一个基于向量嵌入的语义相似度搜索函数。该函数需要：

- 接收一个查询向量（embedding）作为输入
- 计算输入向量与数据库中存储的向量之间的余弦相似度
- 筛选出相似度高于指定阈值的结果
- 返回相似度最高的 N 个结果，包含原始内容和相似度分数
- 使用 SQL ORM 实现数据库查询
```

针对单条的 message 进行 embedding 的转换，增加方法 app/api/openai/embedding.ts，generateSingleEmbedding 和 retrieveEmbedding

定义 server 端的路由，先定义types.ts，然后创建route.ts，
在 Next.js 13+ 的 App Router 中，API 路由的文件命名确实有特定要求：
文件必须命名为 route.ts (或 route.js)，而不是 routes.ts
文件必须放在 app/api/ 目录下的相应路径中
这是因为 Next.js 的 App Router 使用了基于文件系统的路由约定：
page.ts/tsx 用于页面路由
route.ts/tsx 用于 API 路由
layout.ts/tsx 用于布局

使用提示刚生成
```
创建一个基于 Next.js 的流式 AI 对话 API 路由处理器，使用 OpenAI API 实现。该接口需要实现以下功能：

1. 通过 POST 请求接收对话消息
2. 基于最后一条消息使用向量嵌入（embeddings）查找相关内容
3. 创建 OpenAI 的流式对话补全，要求：
   - 将相关内容整合到系统提示词中
   - 使用服务器发送事件（SSE）进行流式响应
   - 在流中同时返回 AI 响应片段和相关内容
```


会遇到报错：public/err-json-parse.jpg
### 启动项目

```bash
# pnpm version >= 9
pnpm install

# 启动storybook业务组件文档
pnpm storybook

# 初始化数据库
pnpm db:migrate

# 初始化embeddings
pnpm openai:embedding
pnpm langchain:embedding
pnpm llamaindex:embedding
pnpm vercelai:embedding

# 启动项目
pnpm dev
```
