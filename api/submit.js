// api/submit.js

import { redisCmd, isRedisConfigured } from './_lib/redis.js';
import { sendTelegramNotification } from './_lib/telegram.js';

const LIST_KEY = 'mqraa:submissions';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  try {
    const data = req.body || {};

    if (!data.name || !data.contact || !data.audioData) {
      return res.status(400).json({
        ok: false,
        error: 'بيانات ناقصة',
      });
    }

    // التأكد من أن Redis مربوط
    if (!isRedisConfigured()) {
      console.error('Redis غير مربوط بالمشروع');

      return res.status(500).json({
        ok: false,
        error: 'قاعدة البيانات غير مربوطة بالمشروع',
      });
    }

    const submission = {
      id:
        'sub_' +
        Date.now() +
        '_' +
        Math.random().toString(36).slice(2, 8),

      name: String(data.name).trim(),
      age: data.age || '',
      city: String(data.city || '').trim(),
      contact: String(data.contact || '').trim(),
      tajweedLevel: data.tajweedLevel || '',
      memorized: data.memorized || '',
      circleId: data.circleId || '',
      circleName: data.circleName || '',
      notes: String(data.notes || '').trim(),
      audioData: data.audioData,
      audioType: data.audioType || '',
      status: 'pending',

      date: new Date().toLocaleString('ar-DZ', {
        timeZone: 'Africa/Algiers',
      }),
    };

    // حفظ الطلب في Redis
    try {
      await redisCmd(
        'LPUSH',
        LIST_KEY,
        JSON.stringify(submission)
      );

      console.log(
        'تم حفظ الطلب في Redis:',
        submission.id
      );
    } catch (dbError) {
      console.error('Database save error:', dbError);

      return res.status(500).json({
        ok: false,
        error: 'تعذر حفظ طلب التسجيل في قاعدة البيانات',
      });
    }

    // إرسال إشعار Telegram
    try {
      await sendTelegramNotification(submission);
    } catch (telegramError) {
      console.error(
        'Telegram notification error:',
        telegramError
      );

      // Telegram لا يمنع نجاح التسجيل
    }

    return res.status(200).json({
      ok: true,
      submission,
    });

  } catch (error) {
    console.error('submit error:', error);

    return res.status(500).json({
      ok: false,
      error: error.message || 'تعذر إرسال الطلب',
    });
  }
}
