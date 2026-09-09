// api/_lib/telegram.js
// إرسال إشعار طلب تسجيل جديد إلى بوت تليجرام (رسالة نصية + تسجيل صوتي مباشر إن وُجد).
// التوكن ورقم الشات يُقرآن من متغيّرات البيئة فقط، ولا يظهران في أي كود.

export async function sendTelegramNotification(data) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID غير مضبوطين في إعدادات البيئة');
    return { ok: false, error: 'Bot not configured' };
  }

  try {
    const text =
      `📩 طلب تسجيل جديد — مقرأة الأترجّة\n\n` +
      `👤 الاسم: ${data.name || '-'}\n` +
      `🎂 السن: ${data.age || '-'}\n` +
      `🏙️ المدينة: ${data.city || '-'}\n` +
      `📞 التواصل: ${data.contact || '-'}\n` +
      `📖 مستوى التجويد: ${data.tajweedLevel || '-'}\n` +
      `📗 مقدار المحفوظ: ${data.memorized || '-'}\n` +
      `🕌 الحلقة المطلوبة: ${data.circleName || '-'}\n` +
      (data.notes ? `📝 ملاحظات: ${data.notes}\n` : '') +
      `🕒 تاريخ الطلب: ${data.date || '-'}`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });

    if (data.audioData && typeof data.audioData === 'string') {
      const match = data.audioData.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const b64 = match[2];
        const buffer = Buffer.from(b64, 'base64');

        if (buffer.length <= 15 * 1024 * 1024) {
          const form = new FormData();
          form.append('chat_id', CHAT_ID);
          form.append('caption', `🎙️ التسجيل الصوتي — ${data.name || 'بدون اسم'}`);
          form.append('voice', new Blob([buffer], { type: mime.includes('ogg') ? mime : 'audio/ogg' }), `voice_${Date.now()}.ogg`);

          const voiceResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVoice`, {
            method: 'POST',
            body: form,
          });
          const voiceJson = await voiceResp.json();

          if (!voiceJson.ok) {
            const fallbackForm = new FormData();
            fallbackForm.append('chat_id', CHAT_ID);
            fallbackForm.append('caption', `🎙️ التسجيل الصوتي — ${data.name || 'بدون اسم'} (تعذّر عرضه كرسالة صوتية مباشرة)`);
            fallbackForm.append('document', new Blob([buffer], { type: mime }), `voice_${Date.now()}.webm`);
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
              method: 'POST',
              body: fallbackForm,
            });
          }
        } else {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: CHAT_ID,
              text: '⚠️ التسجيل الصوتي المرفق كبير جدًا ولم يُرسَل تلقائيًا، يمكن مراجعته من لوحة الإدارة في الموقع.',
            }),
          });
        }
      }
    }

    return { ok: true };
  } catch (err) {
    console.error('Telegram notify error:', err);
    return { ok: false, error: 'Failed to notify' };
  }
}

export async function sendTelegramStatusPing(sub, status) {
  // رسالة داخلية مختصرة للإدارة تؤكد أنّ القرار تم تسجيله (لا تُرسل للطالبة).
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !CHAT_ID) return;
  const label = status === 'accepted' ? '✅ تم قبول' : '❌ تم رفض';
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: `${label} طلب: ${sub.name || '-'} (${sub.circleName || '-'})`,
      }),
    });
  } catch (err) {
    console.error('Telegram status ping error:', err);
  }
}
