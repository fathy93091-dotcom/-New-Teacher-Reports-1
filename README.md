# 📖 DITA - Daily Islamic Teacher Assistant | مساعد المعلم الإسلامي اليومي

تطبيق **DITA** هو مساعد تعليمي وذكاء اصطناعي موجه لمعلمي القرآن الكريم والعلوم الإسلامية لمتابعة الطلاب وتوليد تقارير يومية وشهرية بالذكاء الاصطناعي وتصديرها للوالدين.

---

## 🚀 الاستضافة والرفع على GitHub و Vercel (Deployment Guide)

مشروع DITA جاهز تماماً للاستضافة المباشرة على **GitHub** و **Vercel** بفضل البنية المزدوجة (Vite SPA + Vercel Serverless Functions).

### 1️⃣ الرفع على GitHub (Push to GitHub)

قم بتنفيذ الأوامر التالية في المجلد المحلي للمشروع:

```bash
git init
git add .
git commit -m "Initial commit: DITA App with Vercel & GitHub support"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.name.git
git push -u origin main
```

---

### 2️⃣ الاستضافة المباشرة على Vercel (Deploy to Vercel)

1. توجه إلى [Vercel Dashboard](https://vercel.com/dashboard) واضغط على **"Add New" -> "Project"**.
2. قم بربط حساب **GitHub** واختر المستودع الخاص بالمرشوع (`YOUR_REPOSITORY`).
3. في صفحة الإعدادات (Configure Project):
   - **Framework Preset**: سيقوم Vercel باكتشاف **Vite** تلقائياً.
   - **Root Directory**: `./`
4. **إضافة المتغيرات البيئية (Environment Variables)**:
   - أضف المتغير: `GEMINI_API_KEY`
   - القيمة: مفتاح API الخاص بك من Google AI Studio (لقدرات الذكاء الاصطناعي لتوليد التقارير).
5. اضغط على **Deploy**.

وسيعمل التطبيق والواجهات الخلفية (API Routes) عبر مسارات `/api/*` تلقائياً من خلال Vercel Serverless Functions!

---

## 💻 التشغيل المحلي (Local Development)

```bash
# 1. تثبيت الحزم
npm install

# 2. إعداد مفتاح البيئة
cp .env.example .env
# قم بإضافة مفتاح GEMINI_API_KEY داخل ملف .env

# 3. تشغيل خادم التطوير
npm run dev
```

التطبيق سيعمل محلياً على: `http://localhost:3000`

---

## 📁 هيكلية المشروع (Project Architecture)

- `/src`: واجهة المستخدم (React + Tailwind CSS + Lucide Icons + Motion)
- `/server/app.ts`: مسارات Express API للطلاب، التقارير، والذكاء الاصطناعي
- `/api/index.ts`: مدخل Vercel Serverless Functions للإنتاج
- `vercel.json`: إعدادات إعادة التوجيه لـ Vercel (Rewrites & SPA Fallback)
- `firebase-applet-config.json` & `firestore.rules`: إعدادات قاعدة بيانات Firebase Firestore
