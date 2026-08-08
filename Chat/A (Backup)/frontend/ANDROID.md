# ساخت APK — نوین چت

راهنمای تبدیل فرانت‌اند React (Vite) به فایل **APK اندروید** بدون باز کردن Android Studio.

## چه کارهایی از قبل انجام شده؟

| مورد | وضعیت |
|------|--------|
| `base: './'` در Vite | ✅ |
| `@vitejs/plugin-legacy` (جلوگیری از White Screen) | ✅ |
| Capacitor + پروژه `android/` | ✅ |
| اسکریپت `npm run build:apk` | ✅ |
| Workflow گیت‌هاب برای بیلد ابری | ✅ |

## یک دستور

```bash
cd frontend
npm install --legacy-peer-deps
npm run build:apk
```

خروجی:

```
frontend/releases/novin-chat-debug.apk
```

### روش کار اسکریپت

1. `vite build` (با legacy)
2. `npx cap sync android`
3. ساخت APK با یکی از این‌ها:
   - **SDK محلی** در `frontend/.android-sdk` (یا junction `C:\novin-android-sdk`) — در صورت قطع بودن `sdkmanager`، پکیج‌ها از CDN `gvt1` نصب می‌شوند
   - آینهٔ Maven (علی‌یون / هواوی) برای AGP وقتی `dl.google.com` در دسترس نیست
   - یا **Docker** (`alvrme/alpine-android` / قابل تنظیم با `ANDROID_DOCKER_IMAGE`)
   - یا **GitHub Actions** اگر محلی ممکن نباشد

خروجی فعلی بیلد موفق:

```
frontend/releases/novin-chat-debug.apk
```

(حدود ۱۷ MB — debug، قابل نصب با Unknown sources)

### فقط Gradle (اگر dist از قبل آماده است)

PowerShell:

```powershell
$env:SKIP_WEB='1'; npm run build:apk
```

---

## سفارشی‌سازی نام اپ

فایل `capacitor.config.json`:

```json
{
  "appId": "com.novin.chat",
  "appName": "نوین چت"
}
```

- `appName` → نام زیر آیکون گوشی  
- `appId` → شناسه یکتا (بعد از انتشار عوض نکنید)

سپس:

```bash
npx cap sync android
npm run build:apk
```

در صورت نیاز مقدار `app_name` را در  
`android/app/src/main/res/values/strings.xml` هم ویرایش کنید.

---

## سفارشی‌سازی آیکون

1. تصویر مربعی (ترجیحاً 1024×1024) را بگذارید:

```
frontend/resources/icon.png
frontend/resources/splash.png   # اختیاری
```

2. تولید آیکون‌های اندروید:

```bash
npm run cap:assets
npx cap sync android
```

---

## اتصال بک‌اند در APK

پروکسی Vite روی گوشی وجود ندارد. قبل از بیلد:

```bash
copy .env.production.example .env.production
```

و آدرس سرور را تنظیم کنید:

```env
VITE_API_BASE_URL=http://192.168.1.10:3001
VITE_WS_URL=http://192.168.1.10:3001
```

---

## بیلد ابری (پیشنهادی اگر Docker/SDK محلی سخت بود)

1. پروژه را به GitHub push کنید  
2. Actions → **Build Android APK**  
3. از Artifacts فایل APK را دانلود کنید  

فایل workflow: `.github/workflows/build-apk.yml`

---

## پیش‌نیازها

- Node.js 18+
- Java JDK 17+ (برای بیلد محلی Gradle) — روی سیستم شما OpenJDK 21 هست
- برای بیلد محلی بدون Android Studio:
  - دسترسی دانلود به Android Command-line Tools، **یا**
  - Docker Desktop روشن

> ساخت APK همیشه به Android SDK در *جایی* نیاز دارد. اسکریپت سعی می‌کند SDK را داخل `.android-sdk` یا داخل Docker بیاورد تا Android Studio لازم نباشد.

---

## دستورهای کمکی

```bash
npm run build       # فقط وب
npm run cap:sync    # build + sync
npm run cap:assets  # آیکون/اسپلش
npm run cap:open    # باز کردن در Android Studio (اختیاری)
```
