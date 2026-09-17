# KOZY

영상 우선(video-first) 룸메이트/방 매물 탐색 앱. React Native + Expo SDK 54, Firebase.
프로젝트 규칙·스키마·페이즈 게이트는 [CLAUDE.md](CLAUDE.md), 남은 작업은 [docs/TODO.md](docs/TODO.md).

## 시작하기

```bash
npm install
npx expo start --dev-client
```

이 앱은 **Expo Go로 실행되지 않는다** (네이티브 모듈: expo-video, 지도, Sentry, 푸시 등).
기기/에뮬레이터에 **dev client**(개발용 빌드)가 깔려 있어야 Metro(QR/localhost)에 붙는다.

### dev client는 언제 다시 빌드하나

| 상황 | 필요 조치 |
|---|---|
| JS/JSX만 수정 | 없음 — Metro가 바로 반영 |
| npm 패키지 추가/제거/업그레이드 (네이티브 포함) | dev client 재빌드 |
| `app.json` 플러그인/권한/아이콘/스플래시 변경 | dev client 재빌드 |
| `ios/`, `android/` 직접 수정 | dev client 재빌드 |
| 폰에서 앱을 삭제함 | dev client 재설치 |

iOS·Android 모두 동일. **한 번 설치한 dev client는 위 경우가 아니면 계속 재사용**하고 QR/USB로 Metro만 연결하면 된다.
스토어/TestFlight/내부 테스트에 올라간 빌드는 프로덕션 빌드라 Metro에 붙지 않는다 — 그걸 지우고 다시 받아도 소용없음.

---

## 실기기

### Android (USB)

1. 폰: 개발자 옵션 → USB 디버깅 ON → 케이블 연결 → "USB 디버깅 허용" 팝업에서 **항상 허용** 체크 후 허용.
2. 연결 확인 (시리얼과 모델명이 나온다):
   ```bash
   adb devices -l
   ```
   `unauthorized`면 1번 팝업을 아직 안 누른 것.
3. dev client가 이미 있으면 Metro만 USB로 터널링하고 폰에서 앱 열기 → `http://localhost:8081` 선택:
   ```bash
   adb -s <시리얼> reverse tcp:8081 tcp:8081
   npx expo start --dev-client
   ```
   같은 Wi-Fi면 reverse 없이 QR 스캔으로도 됨.
4. dev client 설치/재빌드 (`--device`는 시리얼이 아니라 **모델명**, 예: `SM_S906U1`):
   ```bash
   npx expo run:android --device <모델명>
   ```
   기기가 여러 개(에뮬레이터 포함)면 `--device`를 꼭 지정한다.

**`No matching variant of project :xxx … No variants exist`로 빌드 실패 시** — 오래된 오토링킹 캐시. 지우고 다시:
```bash
cd android && ./gradlew --stop; rm -rf build/generated/autolinking .gradle/configuration-cache; cd ..
```
`SDK location not found`면 `ANDROID_HOME=$HOME/Library/Android/sdk` export.

### iOS (실기기)

1. Xcode에서 iPhone 연결 + 개발자 모드 ON (설정 → 개인정보 보호 및 보안 → 개발자 모드).
2. dev client 설치/재빌드:
   ```bash
   npx expo run:ios --device
   ```
   (기기 선택 프롬프트가 뜸. 서명은 Xcode `ios/kozy.xcworkspace`의 Signing 설정 사용.)
3. 이후엔 `npx expo start --dev-client` 후 카메라로 QR 스캔 (같은 Wi-Fi).

---

## 에뮬레이터 / 시뮬레이터

### Android 에뮬레이터

```bash
# 설치된 AVD 목록
$HOME/Library/Android/sdk/emulator/emulator -list-avds
# 부팅 (예: Galaxy_S22_API_36, Pixel_9_API_35)
$HOME/Library/Android/sdk/emulator/emulator -avd Galaxy_S22_API_36 &
# dev client 설치 + Metro 연결 (처음 한 번, 또는 재빌드 필요할 때)
npx expo run:android
```
이미 dev client가 있으면 `npx expo start --dev-client` 후 터미널에서 `a`.
에뮬레이터는 `localhost:8081`을 자동으로 호스트에 연결하므로 reverse 불필요.

딥링크로 특정 화면 바로 열기 (테스트용):
```bash
adb shell am start -a android.intent.action.VIEW -d "kozy://account"
```

### iOS 시뮬레이터

```bash
# dev client 설치 + Metro 연결 (처음 한 번, 또는 재빌드 필요할 때)
npx expo run:ios
# 특정 시뮬레이터
npx expo run:ios --simulator "iPhone 16 Pro"
```
이미 dev client가 있으면 `npx expo start --dev-client` 후 터미널에서 `i`.
`ios/` 변경 후 `pod install`이 필요하면 `npx pod-install`.

---

## 버전 / 빌드 번호

app.json이 단일 소스. 스크립트가 Info.plist·build.gradle까지 같이 갱신한다 (prebuild 불필요).

```bash
node scripts/set-version.js            # 현재 값 출력
node scripts/set-version.js 1.1.0      # 버전 설정 + 빌드 +1
node scripts/set-version.js 1.1.0 3    # 버전 + 빌드 번호 명시
```
- `version`은 스토어에 보이는 마케팅 버전 — 기능 묶음 단위로만 올린다.
- 빌드 번호는 **업로드마다 +1**. 같은 버전으로 여러 빌드를 올려도 TestFlight/Play 내부 테스트 정상.

## 릴리즈 빌드

- **iOS**: Xcode → `ios/kozy.xcworkspace` → Product → Archive → TestFlight. Sentry 소스맵은 아카이브 시 자동 업로드(`ios/sentry.properties`, gitignored).
- **Android**: `cd android && ./gradlew bundleRelease` → `app/build/outputs/bundle/release/*.aab` → Play Console. (`android/sentry.properties` 필요)
- 프리플라이트 체크리스트: [docs/TODO.md](docs/TODO.md) "Live 전 필수" + haewooso-labs `init-mobile` 스킬 Step 9.

## 운영 스크립트 (`scripts/`)

| 스크립트 | 용도 |
|---|---|
| `set-version.js` | 버전/빌드 번호 일괄 갱신 |
| `delete-test-users.js [--yes] [--keep-chats] <uid>…` | 테스트 계정 완전 삭제 (리스팅·채팅·신고·Storage·Auth). 기본 dry-run |
| `apply-native-patches.js` | postinstall — react-native-maps iOS 마커 패치 |

관리 스크립트는 `firebase-admin` + ADC(`gcloud auth application-default login`) 또는 `GOOGLE_APPLICATION_CREDENTIALS`로 인증.

## Firebase Functions

```bash
cd functions && npx firebase deploy --only functions:<이름>
```
함수 목록: `functions/src/index.js`. 시크릿은 `firebase functions:secrets:set` (배포 시점 버전이 묶이므로 시크릿 교체 후 반드시 재배포).

## 웹사이트 (`website/`)

정적 HTML/CSS, Vercel 배포 (`node build.js` → `public/`). `website/public/`은 산출물이라 직접 수정 금지.
로컬 프리뷰: `.claude/launch.json`의 `website` 설정 (python http.server, 4173).
