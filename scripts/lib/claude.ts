import Anthropic from '@anthropic-ai/sdk';
import { requireEnv, optionalEnv } from './env.ts';

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
  }
  return client;
}

export const CLAUDE_MODEL = () => optionalEnv('CLAUDE_MODEL', 'claude-sonnet-5');

/**
 * Claude에 프롬프트를 보내 JSON 응답을 파싱한다.
 * 모델이 JSON 외 텍스트를 덧붙이는 경우를 대비해 첫 번째 JSON 블록만 추출한다.
 */
export async function askJson<T>(system: string, user: string, maxTokens = 2048): Promise<T> {
  const resp = await getClient().messages.create({
    model: CLAUDE_MODEL(),
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  return parseJsonLoose<T>(text);
}

function parseJsonLoose<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.search(/[[{]/);
    const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T;
    }
    throw new Error(`Claude 응답을 JSON으로 파싱하지 못했습니다:\n${text.slice(0, 500)}`);
  }
}
