#!/usr/bin/env node
/**
 * Builds the Vite web app, syncs Capacitor Android, then produces a debug APK.
 *
 * Strategy (no Android Studio required):
 *  1) Local Android SDK under frontend/.android-sdk (auto-downloaded cmdline-tools)
 *  2) Else Docker image with Android SDK
 *  3) Else print GitHub Actions instructions
 *
 * Usage:
 *   npm run build:apk
 *   SKIP_WEB=1 npm run build:apk   # reuse existing dist/
 */
import { spawn } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'android');
const releasesDir = path.join(root, 'releases');
const localSdkDir = path.join(root, '.android-sdk');
const apkOutName = 'novin-chat-debug.apk';

const isWin = process.platform === 'win32';

const CMDTOOLS = {
  win32:
    'https://redirector.gvt1.com/edgedl/android/repository/commandlinetools-win-13114758_latest.zip',
  darwin:
    'https://redirector.gvt1.com/edgedl/android/repository/commandlinetools-mac-13114758_latest.zip',
  linux:
    'https://redirector.gvt1.com/edgedl/android/repository/commandlinetools-linux-13114758_latest.zip',
};

function log(msg) {
  console.log(`\n[build:apk] ${msg}`);
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || root,
      stdio: opts.stdio ?? 'inherit',
      shell: opts.shell ?? false,
      env: { ...process.env, ...(opts.env || {}) },
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function commandExists(bin) {
  try {
    await run(isWin ? 'where' : 'which', [bin], { stdio: 'ignore', shell: true });
    return true;
  } catch {
    return false;
  }
}

function findBuiltApk() {
  const candidates = [
    path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk'),
    path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  const debugDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug');
  if (existsSync(debugDir)) {
    const apk = readdirSync(debugDir).find((f) => f.endsWith('.apk'));
    if (apk) return path.join(debugDir, apk);
  }
  return null;
}

function publishApk(apkPath) {
  mkdirSync(releasesDir, { recursive: true });
  const dest = path.join(releasesDir, apkOutName);
  copyFileSync(apkPath, dest);
  const mb = (statSync(dest).size / (1024 * 1024)).toFixed(2);
  log(`APK آماده شد → ${dest} (${mb} MB)`);
  return dest;
}

async function download(url, dest) {
  // Prefer curl on Windows — follows CDN redirects more reliably for large SDK zips
  if (await commandExists('curl')) {
    log(`دانلود با curl → ${path.basename(dest)}`);
    await run(
      'curl.exe',
      ['-L', '--retry', '3', '--retry-delay', '2', '-o', dest, url],
      { shell: false }
    );
    if (!existsSync(dest) || statSync(dest).size < 1000) {
      throw new Error(`دانلود ناقص: ${dest}`);
    }
    return;
  }

  await new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const get = url.startsWith('https') ? https.get : http.get;
    const req = get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed ${res.statusCode} for ${url}`));
        return;
      }
      pipeline(res, file).then(resolve).catch(reject);
    });
    req.on('error', reject);
  });
}

async function unzip(zipPath, outDir) {
  mkdirSync(outDir, { recursive: true });
  if (isWin) {
    await run(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${outDir.replace(/'/g, "''")}' -Force`,
      ],
      { shell: false }
    );
    return;
  }
  await run('unzip', ['-oq', zipPath, '-d', outDir]);
}

function moveDir(src, dest) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(path.dirname(dest), { recursive: true });
  try {
    renameSync(src, dest);
  } catch {
    // Windows often locks rename across dirs (AV / Explorer) — copy then delete
    cpSync(src, dest, { recursive: true });
    rmSync(src, { recursive: true, force: true });
  }
}

function sdkmanagerBin(sdkRoot) {
  const base = path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin');
  return path.join(base, isWin ? 'sdkmanager.bat' : 'sdkmanager');
}

/** Prefer short junction path on Windows (spaces break sdkmanager/cmd). */
function resolveSdkRoot() {
  if (isWin && existsSync('C:\\novin-android-sdk')) return 'C:\\novin-android-sdk';
  return localSdkDir;
}

function sdkReady(sdkRoot) {
  const platform =
    existsSync(path.join(sdkRoot, 'platforms', 'android-35', 'android.jar')) ||
    existsSync(path.join(sdkRoot, 'platforms', 'android-36', 'android.jar'));
  const buildTools =
    existsSync(path.join(sdkRoot, 'build-tools', '35.0.0', 'aapt.exe')) ||
    existsSync(path.join(sdkRoot, 'build-tools', '35.0.0', 'aapt')) ||
    existsSync(path.join(sdkRoot, 'build-tools', '36.0.0', 'aapt.exe')) ||
    existsSync(path.join(sdkRoot, 'build-tools', '36.0.0', 'aapt'));
  return platform && buildTools;
}

function writeLicenses(sdkRoot) {
  const licensesDir = path.join(sdkRoot, 'licenses');
  mkdirSync(licensesDir, { recursive: true });
  const licenseHashes = {
    'android-sdk-license': '24333f8a63b6825ea9c5514f83c2829b004d1fee',
    'android-sdk-preview-license': '84831b9409646a918e30573bab4c9c91346d8abd',
    'google-gdk-license': '33b6a2b64607f11b759f320ef9dff4ae5c47d97a',
  };
  for (const [name, hash] of Object.entries(licenseHashes)) {
    writeFileSync(path.join(licensesDir, name), `\n${hash}\n`, 'utf8');
  }
}

/**
 * Offline install via gvt1 CDN when sdkmanager cannot reach Google repos.
 * URLs match packages previously verified working in this environment.
 */
async function installSdkPackagesOffline(sdkRoot) {
  const plat = isWin ? 'windows' : process.platform === 'darwin' ? 'macosx' : 'linux';
  const pkgs = [
    {
      url: 'https://redirector.gvt1.com/edgedl/android/repository/platform-36_r01.zip',
      zip: 'platform-36.zip',
      find: 'android-36',
      dest: path.join(sdkRoot, 'platforms', 'android-36'),
      marker: path.join(sdkRoot, 'platforms', 'android-36', 'android.jar'),
    },
    {
      url: 'https://redirector.gvt1.com/edgedl/android/repository/platform-35_r02.zip',
      zip: 'platform-35.zip',
      find: 'android-35',
      dest: path.join(sdkRoot, 'platforms', 'android-35'),
      marker: path.join(sdkRoot, 'platforms', 'android-35', 'android.jar'),
    },
    {
      url: `https://redirector.gvt1.com/edgedl/android/repository/build-tools_r35_${plat === 'windows' ? 'windows' : plat === 'macosx' ? 'macosx' : 'linux'}.zip`,
      zip: 'build-tools-35.zip',
      // API 35 build-tools zip extracts as android-15/
      find: null,
      dest: path.join(sdkRoot, 'build-tools', '35.0.0'),
      marker: path.join(
        sdkRoot,
        'build-tools',
        '35.0.0',
        isWin ? 'aapt.exe' : 'aapt'
      ),
    },
    {
      url: `https://redirector.gvt1.com/edgedl/android/repository/platform-tools-latest-${plat === 'windows' ? 'windows' : plat === 'macosx' ? 'darwin' : 'linux'}.zip`,
      zip: 'platform-tools.zip',
      find: 'platform-tools',
      dest: path.join(sdkRoot, 'platform-tools'),
      marker: path.join(sdkRoot, 'platform-tools', isWin ? 'adb.exe' : 'adb'),
    },
  ];

  const cache = path.join(sdkRoot, '_pkgs');
  mkdirSync(cache, { recursive: true });

  for (const pkg of pkgs) {
    if (existsSync(pkg.marker)) {
      log(`از قبل نصب: ${path.basename(pkg.dest)}`);
      continue;
    }
    log(`دانلود آفلاین SDK → ${pkg.zip}`);
    const zipPath = path.join(cache, pkg.zip);
    if (!existsSync(zipPath) || statSync(zipPath).size < 1_000_000) {
      await download(pkg.url, zipPath);
    }
    const out = path.join(cache, `${pkg.zip}-out`);
    rmSync(out, { recursive: true, force: true });
    await unzip(zipPath, out);

    let src = pkg.find ? path.join(out, pkg.find) : null;
    if (!src || !existsSync(src)) {
      const kids = readdirSync(out).filter((n) => !n.startsWith('.'));
      if (kids.length === 1) src = path.join(out, kids[0]);
      else if (pkg.find) throw new Error(`پوشه ${pkg.find} در ${pkg.zip} پیدا نشد`);
      else src = path.join(out, kids.find((k) => k.startsWith('android-')) || kids[0]);
    }
    moveDir(src, pkg.dest);
  }
  writeLicenses(sdkRoot);
}

async function ensureLocalSdk() {
  const sdkRoot = resolveSdkRoot();
  mkdirSync(localSdkDir, { recursive: true });
  if (sdkRoot !== localSdkDir) {
    // Keep junction target = localSdkDir if using C:\novin-android-sdk
  }

  if (sdkReady(sdkRoot) || sdkReady(localSdkDir)) {
    const ready = sdkReady(sdkRoot) ? sdkRoot : localSdkDir;
    log(`SDK محلی آماده است → ${ready}`);
    writeLicenses(ready);
    return ready;
  }

  const sm = sdkmanagerBin(localSdkDir);
  if (!existsSync(sm)) {
    log('دانلود Android Command-line Tools (یک‌بار، بدون Android Studio)...');
    const url = CMDTOOLS[process.platform] || CMDTOOLS.linux;
    const zipPath = path.join(localSdkDir, 'cmdline-tools.zip');
    if (!existsSync(zipPath) || statSync(zipPath).size < 1_000_000) {
      await download(url, zipPath);
    }

    const extractTmp = path.join(localSdkDir, '_cmdtools_tmp');
    rmSync(extractTmp, { recursive: true, force: true });
    await unzip(zipPath, extractTmp);

    const latest = path.join(localSdkDir, 'cmdline-tools', 'latest');
    rmSync(path.join(localSdkDir, 'cmdline-tools'), { recursive: true, force: true });
    mkdirSync(path.join(localSdkDir, 'cmdline-tools'), { recursive: true });

    const extractedRoot = path.join(extractTmp, 'cmdline-tools');
    if (existsSync(extractedRoot)) {
      moveDir(extractedRoot, latest);
    } else {
      const kids = readdirSync(extractTmp);
      if (kids.length === 1) {
        moveDir(path.join(extractTmp, kids[0]), latest);
      } else {
        moveDir(extractTmp, latest);
      }
    }
    rmSync(extractTmp, { recursive: true, force: true });
  }

  writeLicenses(sdkRoot);

  log('نصب platform + build-tools...');
  const packages = ['platform-tools', 'platforms;android-35', 'build-tools;35.0.0'];

  const runSdkManager = async (pkgs) => {
    const root = resolveSdkRoot();
    const smPath = existsSync(sdkmanagerBin(root))
      ? sdkmanagerBin(root)
      : sdkmanagerBin(localSdkDir);

    const args = [`--sdk_root=${root}`, ...pkgs]
      .map((a) => `'${String(a).replace(/'/g, "''")}'`)
      .join(' ');
    const ps = `& '${smPath.replace(/'/g, "''")}' ${args}`;
    await run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
      shell: false,
      env: {
        ...process.env,
        ANDROID_HOME: root,
        ANDROID_SDK_ROOT: root,
      },
    });
  };

  try {
    if (existsSync(sdkmanagerBin(localSdkDir)) || existsSync(sdkmanagerBin(sdkRoot))) {
      await runSdkManager(packages);
    } else {
      throw new Error('sdkmanager missing');
    }
  } catch (err) {
    console.warn('[build:apk] sdkmanager ناموفق — نصب مستقیم از gvt1:', err.message);
    await installSdkPackagesOffline(resolveSdkRoot());
  }

  const finalRoot = resolveSdkRoot();
  if (!sdkReady(finalRoot) && !sdkReady(localSdkDir)) {
    await installSdkPackagesOffline(finalRoot);
  }

  if (!sdkReady(finalRoot) && !sdkReady(localSdkDir)) {
    throw new Error('نصب SDK کامل نشد (platforms/build-tools)');
  }

  return sdkReady(finalRoot) ? finalRoot : localSdkDir;
}

async function buildWeb() {
  log('ساخت وب برای APK (vite --mode apk)...');
  await run(isWin ? 'npm.cmd' : 'npm', ['run', 'build:apk-web'], { shell: isWin });
}

async function ensureAndroidPlatform() {
  if (!existsSync(androidDir)) {
    log('افزودن پلتفرم Android (اولین بار)...');
    await run(isWin ? 'npx.cmd' : 'npx', ['cap', 'add', 'android'], { shell: isWin });
  }
}

async function syncCapacitor() {
  log('همگام‌سازی Capacitor با android...');
  await run(isWin ? 'npx.cmd' : 'npx', ['cap', 'sync', 'android'], { shell: isWin });
  patchCapacitorGradleMirrors();
}

/** Ensure Capacitor/Cordova module buildscripts can resolve AGP via mirrors. */
function patchCapacitorGradleMirrors() {
  const files = [
    path.join(root, 'node_modules', '@capacitor', 'android', 'capacitor', 'build.gradle'),
    path.join(androidDir, 'capacitor-cordova-android-plugins', 'build.gradle'),
  ];
  const needle = `buildscript {
    repositories {
        google()
        mavenCentral()`;
  const insert = `buildscript {
    repositories {
        maven { url = "https://maven.aliyun.com/repository/google" }
        maven { url = "https://maven.aliyun.com/repository/public" }
        maven { url = "https://repo.huaweicloud.com/repository/maven" }
        google()
        mavenCentral()`;
  for (const file of files) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    if (text.includes('maven.aliyun.com/repository/google')) continue;
    if (!text.includes(needle)) continue;
    writeFileSync(file, text.replace(needle, insert), 'utf8');
    log(`آینه Maven → ${path.relative(root, file)}`);
  }
}

function dockerHostPath(hostPath) {
  if (!isWin) return hostPath;
  const normalized = path.resolve(hostPath).replace(/\\/g, '/');
  const m = normalized.match(/^([A-Za-z]):\/(.*)$/);
  if (m) return `/${m[1].toLowerCase()}/${m[2]}`;
  return normalized;
}

async function buildWithDocker() {
  log('ساخت APK با Docker...');
  const image = process.env.ANDROID_DOCKER_IMAGE || 'alvrme/alpine-android:android-35-jdk21';
  const volume = `${dockerHostPath(root)}:/project`;
  const gradleCmd = [
    'set -e',
    'chmod +x ./gradlew',
    'yes | sdkmanager --licenses >/dev/null 2>&1 || true',
    './gradlew assembleDebug --no-daemon --stacktrace',
  ].join(' && ');

  await run(
    'docker',
    [
      'run',
      '--rm',
      '-v',
      volume,
      '-w',
      '/project/android',
      image,
      'bash',
      '-lc',
      gradleCmd,
    ],
    { shell: false }
  );
}

async function buildWithLocalGradle(sdkRoot) {
  log('ساخت APK با Gradle...');
  const gradlew = isWin ? 'gradlew.bat' : './gradlew';
  const effectiveSdk =
    existsSync('C:\\novin-android-sdk\\platforms') || existsSync('C:\\novin-android-sdk\\cmdline-tools')
      ? 'C:\\novin-android-sdk'
      : sdkRoot;
  const localProps = path.join(androidDir, 'local.properties');
  const sdkPathEscaped = effectiveSdk.replace(/\\/g, '/');
  writeFileSync(localProps, `sdk.dir=${sdkPathEscaped}\n`, 'utf8');

  const initMirrorsNoSpace = isWin ? 'C:\\novin-android-sdk\\init-mirrors.gradle' : '';
  const initMirrors = existsSync(initMirrorsNoSpace)
    ? initMirrorsNoSpace
    : path.join(androidDir, 'init-mirrors.gradle');
  if (isWin && existsSync(path.join(androidDir, 'init-mirrors.gradle')) && initMirrors === initMirrorsNoSpace) {
    // keep short path copy in sync
    try {
      copyFileSync(path.join(androidDir, 'init-mirrors.gradle'), initMirrorsNoSpace);
    } catch {
      /* ignore */
    }
  }
  const gradleArgs = ['assembleDebug', '--no-daemon', '--stacktrace'];
  if (existsSync(initMirrors)) {
    gradleArgs.push(`--init-script=${initMirrors}`);
  }

  await run(gradlew, gradleArgs, {
    cwd: androidDir,
    shell: isWin,
    env: {
      ...process.env,
      ANDROID_HOME: effectiveSdk,
      ANDROID_SDK_ROOT: effectiveSdk,
    },
  });
}

async function main() {
  process.chdir(root);

  if (!existsSync(path.join(root, 'package.json'))) {
    throw new Error('این اسکریپت باید از ریشهٔ frontend اجرا شود');
  }

  if (process.env.SKIP_WEB !== '1') {
    await buildWeb();
  } else {
    log('SKIP_WEB=1 — از dist موجود استفاده می‌شود');
  }
  await ensureAndroidPlatform();
  if (process.env.SKIP_SYNC !== '1') {
    await syncCapacitor();
  } else {
    patchCapacitorGradleMirrors();
  }

  const envSdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  const hasDocker = await commandExists('docker');
  const hasGradlew = existsSync(path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew'));
  const hasJava = await commandExists('java');

  let built = false;

  // Prefer local SDK bootstrap (no Android Studio, no huge Docker image)
  if (hasGradlew && hasJava) {
    try {
      const sdk = envSdk && existsSync(envSdk) ? envSdk : await ensureLocalSdk();
      await buildWithLocalGradle(sdk);
      built = true;
    } catch (err) {
      console.warn('\n[build:apk] بیلد محلی ناموفق:', err.message);
      if (hasDocker) {
        log('تلاش با Docker...');
        await buildWithDocker();
        built = true;
      } else {
        throw err;
      }
    }
  } else if (hasDocker) {
    await buildWithDocker();
    built = true;
  } else {
    console.error(`
[build:apk] پیش‌نیازها:
  - Java JDK 17+ (روی سیستم شما معمولاً کافی است)
  - یا Docker Desktop
  - یا GitHub Actions (.github/workflows/build-apk.yml)
`);
    process.exit(1);
  }

  if (!built) process.exit(1);

  const apk = findBuiltApk();
  if (!apk) {
    throw new Error('APK ساخته نشد؛ خروجی Gradle را بررسی کنید');
  }
  publishApk(apk);
  log('تمام. فایل را روی گوشی کپی و نصب کنید (Unknown sources).');
}

main().catch((err) => {
  console.error('\n[build:apk] خطا:', err.message || err);
  process.exit(1);
});
