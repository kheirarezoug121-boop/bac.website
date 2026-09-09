// api/update-status.js

import {
  redisCmd,
  isRedisConfigured,
} from './_lib/redis.js';

import {
  sendTelegramStatusPing,
} from './_lib/telegram.js';


const LIST_KEY = 'mqraa:submissions';


// كلمة مرور الإدارة
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD;


export default async function handler(req, res) {

  // =========================================
  // السماح فقط بـ POST
  // =========================================

  if (req.method !== 'POST') {

    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });

  }


  // =========================================
  // التحقق من كلمة مرور الإدارة
  // =========================================

  const password =
    req.headers['x-admin-pass'];


  if (
    !ADMIN_PASSWORD ||
    password !== ADMIN_PASSWORD
  ) {

    return res.status(401).json({
      ok: false,
      error: 'غير مصرح',
    });

  }


  // =========================================
  // التحقق من Redis
  // =========================================

  if (!isRedisConfigured()) {

    return res.status(500).json({

      ok: false,

      error:
        'قاعدة البيانات غير مربوطة',

    });

  }


  try {

    // =======================================
    // قراءة البيانات
    // =======================================

    const {
      id,
      status,
    } = req.body || {};


    // =======================================
    // التحقق من البيانات
    // =======================================

    const allowedStatuses = [
      'accepted',
      'rejected',
      'pending',
    ];


    if (
      !id ||
      !allowedStatuses.includes(status)
    ) {

      return res.status(400).json({

        ok: false,

        error: 'بيانات غير صحيحة',

      });

    }


    // =======================================
    // جلب الطلبات
    // =======================================

    const raw = await redisCmd(
      'LRANGE',
      LIST_KEY,
      '0',
      '-1'
    );


    let index = -1;
    let updated = null;


    // =======================================
    // البحث عن الطلب
    // =======================================

    for (
      let i = 0;
      i < raw.length;
      i++
    ) {

      try {

        const parsed =
          JSON.parse(raw[i]);


        if (parsed.id === id) {

          parsed.status = status;

          updated = parsed;

          index = i;

          break;

        }

      } catch (error) {

        // تجاهل أي عنصر تالف
        console.error(
          'خطأ في قراءة عنصر Redis:',
          error
        );

      }

    }


    // =======================================
    // الطلب غير موجود
    // =======================================

    if (index === -1) {

      return res.status(404).json({

        ok: false,

        error: 'الطلب غير موجود',

      });

    }


    // =======================================
    // تحديث الطلب في Redis
    // =======================================

    await redisCmd(

      'LSET',

      LIST_KEY,

      index,

      JSON.stringify(updated)

    );


    // =======================================
    // إرسال إشعار Telegram
    // =======================================

    try {

      await sendTelegramStatusPing(
        updated,
        status
      );

    } catch (telegramError) {

      console.error(
        'Telegram status error:',
        telegramError
      );

    }


    // =======================================
    // إرجاع النتيجة
    // =======================================

    return res.status(200).json({

      ok: true,

      submission: updated,

    });


  } catch (error) {

    console.error(
      'update-status error:',
      error
    );


    return res.status(500).json({

      ok: false,

      error: 'تعذّر تحديث الحالة',

    });

  }
}
