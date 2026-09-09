// api/_lib/redis.js

const REDIS_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL;

const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

export function isRedisConfigured() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

export async function redisCmd(...command) {
  if (!isRedisConfigured()) {
    throw new Error(
      'قاعدة البيانات Redis غير مربوطة بالمشروع على Vercel'
    );
  }

  const response = await fetch(REDIS_URL, {
    method: 'POST',

    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },

    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(
      `Redis request failed: ${response.status}`
    );
