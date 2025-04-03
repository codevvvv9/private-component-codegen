import { ChatCompletionMessageParam } from "openai/resources/index.mjs"

export type OpenAIRequest = {
  message: ChatCompletionMessageParam[]
}