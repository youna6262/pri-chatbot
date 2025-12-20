# Netlify 배포 체크리스트

## 1. 브랜치 설정 확인 ✅

현재 브랜치: `testpush`
- Netlify 대시보드에서 **Production branch**를 `testpush`로 설정했는지 확인
- 또는 **Branch deploys**에서 `testpush` 브랜치가 활성화되어 있는지 확인

## 2. Netlify 대시보드 설정 확인

### Build settings
- **Build command**: `npm run build` (또는 `npm run build`)
- **Publish directory**: `dist`
- **Node version**: `20`

### Environment variables
필요한 환경변수가 있다면 추가:
- `VITE_FIREBASE_API_KEY` (필요시)
- 기타 환경변수

## 3. Git 연동 확인

1. Netlify 대시보드 → **Site settings** → **Build & deploy** → **Continuous Deployment**
2. **Connected repository** 확인
3. **Production branch**: `testpush`로 설정
4. **Branch deploys**: `testpush` 활성화

## 4. 배포 오류 확인

Netlify 대시보드에서:
1. **Deploys** 탭 확인
2. 실패한 배포 클릭
3. **Deploy log** 확인하여 오류 메시지 확인

### 일반적인 오류들:

#### 오류 1: "Build command failed"
- `package.json`에 `build` 스크립트가 있는지 확인
- 로컬에서 `npm run build`가 성공하는지 확인

#### 오류 2: "Publish directory does not exist"
- `dist` 폴더가 생성되는지 확인
- `publish` 경로가 올바른지 확인

#### 오류 3: "Module not found"
- `package.json`에 필요한 의존성이 있는지 확인
- `node_modules`가 제대로 설치되는지 확인

## 5. 수동 배포 테스트

```bash
# 로컬에서 빌드 테스트
npm install
npm run build

# 빌드가 성공하면 dist 폴더가 생성됨
```

## 6. 브랜치 푸시 확인

```bash
# 현재 브랜치 확인
git branch

# 변경사항 커밋 (있다면)
git add .
git commit -m "Netlify 배포 설정"

# testpush 브랜치에 푸시
git push origin testpush
```

## 7. Netlify에서 확인

1. Netlify 대시보드 → **Deploys** 탭
2. `testpush` 브랜치의 최신 배포 확인
3. 배포 상태 확인 (Building → Published)

## 문제 해결

### 브랜치가 감지되지 않는 경우
- Netlify 대시보드에서 **Trigger deploy** → **Deploy site** 클릭
- 또는 Git에서 `testpush` 브랜치를 다시 푸시

### 빌드가 계속 실패하는 경우
- Netlify 대시보드의 **Deploy log** 확인
- 로컬에서 동일한 명령어로 빌드 테스트
- `netlify.toml` 설정 확인










