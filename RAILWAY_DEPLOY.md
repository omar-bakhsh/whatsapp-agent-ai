# خطوات رفع وتشغيل البوت على Railway.app 🚀

## 1. ربط المشروع في Railway:
1. ادخل إلى [Railway.app](https://railway.app) وسجّل الدخول بحساب **GitHub**.
2. اضغط على **"New Project"** -> اختر **"Deploy from GitHub repo"**.
3. اختر مستودع المشروع: `whatsapp-agent-ai`.

---

## 2. إضافة المتغيرات البيئية (Variables):
في صفحة المشروع على Railway، ادخل على تبويب **Variables** وأضف المتغيرات التالية:
- `GEMINI_API_KEY`: مفتاح Google Gemini الخاص بك.
- `GROQ_API_KEY`: مفتاح Groq الاحتياطي.
- `ADMIN_NUMBER_ABU_ALI`: رقم المشرف أبو علي (مثال: `966562185308@c.us`).

---

## 3. حفظ جلسة الواتساب بشكل دائم (Volume):
حتى لا تضطر لمسح الباركود بعد كل عملية إعادة بناء (Rebuild):
1. اذهب إلى إعدادات الخدمة في Railway.
2. اضغط على **"Volumes"** -> **"Add Volume"**.
3. اجعل مسار الربط (Mount Path):
   `/app/.wwebjs_auth`

---

## 4. مسح باركود الواتساب (QR Code):
1. اذهب إلى تبويب **"Deploy Logs"** أو **"View Logs"**.
2. عند اكتمال التحميل، سيظهر لك باركود QR code في السجلات.
3. افتح تطبيق الواتساب على هاتفك -> **الأجهزة المرتبطة** -> امسح الباركود.
4. بمجرد ظهور رسالة:
   `Bot started successfully 100%! Ready to receive customer messages 🚀`
   سيكون البوت متصلاً ويعمل على مدار 24 ساعة في السيرفر!
