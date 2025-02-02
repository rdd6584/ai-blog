import dotenv from 'dotenv';

dotenv.config(); // 환경 변수 로드

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import OpenAI from 'openai';
import matter from 'gray-matter';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// 환경 변수 로드
const OPENAI_KEY = process.env.OPENAI_KEY;

if (!OPENAI_KEY) {
  throw new Error('Missing OPENAI_KEY in environment variables.');
}

const openai = new OpenAI({
  apiKey: OPENAI_KEY,
});

// 콘텐츠 디렉토리 경로
const CONTENT_DIR = path.join(process.cwd(), 'app/posts/contents');
// 임베딩 저장 파일 경로
const EMBEDDINGS_FILE = path.join(process.cwd(), 'embeddings.json');

async function generateEmbeddings() {
  const files = await readdir(CONTENT_DIR);
  const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

  console.log(files, mdxFiles);
  const embeddings: any[] = [];

  for (const file of mdxFiles) {
    const filePath = path.join(CONTENT_DIR, file);
    const fileContents = await readFile(filePath, 'utf-8');
    const { data, content } = matter(fileContents); // 메타데이터와 콘텐츠 분리

    const title = data.title || path.basename(file, '.mdx');
    const id = data.id || path.basename(file, '.mdx');

    // 임베딩 생성
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: content.replace(/\n/g, ' '),
    });

    const embedding = embeddingResponse.data;

    embeddings.push({
      id,
      title,
      content,
      embedding: embedding[0].embedding,
    });

    console.log(`Generated embedding for ${file}`);
  }

  // 임베딩 저장
  await writeFile(EMBEDDINGS_FILE, JSON.stringify(embeddings, null, 2));
  console.log(`Embeddings saved to ${EMBEDDINGS_FILE}`);
}

generateEmbeddings()
  .then(() => {
    console.log('Embedding generation completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error generating embeddings:', error);
    process.exit(1);
  });
