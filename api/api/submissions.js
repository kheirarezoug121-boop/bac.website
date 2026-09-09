// api/submissions.js

import {
  redisCmd,
  isRedisConfigured,
} from './_lib/redis.js';

const LIST_KEY = 'mqraa:submissions';


// كلمة مرور لوحة الإدارة
// يجب وضعها في Vercel Environment Variables
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD;


export default async function handler(req, res) {

  // =========================================
  // السماح فقط بطلب GET
  // =========================================

  if (req.method !== 'GET') {

    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });

  }


  // =========================================
  // التحقق من كلمة مرور الإدارة
  // =========================================

