// pages/api/ask.ts
import { NextResponse } from 'next/server';
import OpenAPI from 'openai';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import GPT3Tokenizer from 'gpt3-tokenizer';

const readFile = promisify(fs.readFile);

// 환경 변수 로드
const OPENAI_KEY = process.env.OPENAI_KEY;
if (!OPENAI_KEY) {
  throw new Error('Missing OPENAI_KEY in environment variables.');
}

const openai = new OpenAPI({
  apiKey: OPENAI_KEY,
});

// 임베딩 파일 경로
const EMBEDDINGS_FILE = path.join(process.cwd(), 'embeddings.json');

// 코사인 유사도 함수
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, idx) => sum + val * b[idx], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();  

    if (!prompt) {
      throw new Error('Missing prompt in request body.');
    }

    // 1. 질문 임베딩 생성
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: prompt.replace(/\n/g, ' '),
    });

    const questionEmbedding = embeddingResponse.data[0].embedding;
 
    // 2. 모든 임베딩 로드
    const embeddingsData: {
      id: string;
      title: string;
      content: string;
      embedding: number[];
    }[] = JSON.parse(await readFile(EMBEDDINGS_FILE, 'utf-8'));

    // 3. 유사도 계산 및 상위 5개 콘텐츠 선택
    const similarities = embeddingsData.map((section) => ({
      ...section,
      similarity: cosineSimilarity(questionEmbedding, section.embedding),
    }));

    // 유사도 기준으로 내림차순 정렬
    similarities.sort((a, b) => b.similarity - a.similarity);

    // 상위 N개 선택 (예: 5개)
    const topSections = similarities.slice(0, 5).filter((s) => s.similarity > 0.2); // 임계값 설정

    // 4. 컨텍스트 조립
    const tokenizer = new GPT3Tokenizer({ type: 'gpt3' });
    let tokenCount = 0;
    let contextText = '';

    for (const section of topSections) {
      const content = section.content;
      const encoded = tokenizer.encode(content);
      tokenCount += encoded.text.length;

      console.log(tokenCount)
      if (tokenCount >= 5000) {
        break;
      }

      contextText += `${content.trim()}\n---\n`;
    }

    // 5. OpenAI Chat Completion 요청
    const promptText = `
      Context sections:
      ${contextText}

      Question: """
      ${prompt}
      """
    `;

    console.log(promptText)

    const prePrompt = `
      You are a very enthusiastic representative who loves to help people!
      Given the following sections from the documentation, answer the question using only that information,
      outputted in markdown format. 답변할 때, 마크다운 관련 문법은 지우고 말해줘. 예를 들어 '##'이나 '**' 같은 것들이 있어.
      If you are unsure and the answer is not explicitly written in the documentation, say
      "죄송하지만, 해당 내용은 알 수 없어요! 이 블로그에 관한 내용만 질문해주세요!"
    `;

    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prePrompt },
        { role: 'user', content: promptText },
      ],
      max_tokens: 512,
      temperature: 0,
    });

    const answer = chatResponse.choices[0].message.content?.trim() || 'No answer provided.';

    // 6. 답변 반환
    console.log(answer)
    return NextResponse.json({ answer });
  } catch (error) {
    console.error('OpenAI API 호출 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
