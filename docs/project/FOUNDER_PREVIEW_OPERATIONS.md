# Founder Preview Operations

Version: 1.2

Last Updated: 2026-08-31

Related Task: MYOTT-S09-OPS-001A

Status: ACTIVE

이 문서는 MyOTT Founder Preview Server의 로컬 생명주기와 Codex 작업 중 Port 운영 규칙을 정의합니다. Founder Preview는 항상 다음 주소를 사용합니다.

```text
http://127.0.0.1:3000
```

---

## 1. 목적

- Founder가 같은 브라우저 주소에서 최신 Working Tree를 반복 확인할 수 있게 한다.
- 여러 Codex 작업이 남긴 MyOTT Next.js 개발 서버를 안전하게 정리한다.
- Build 또는 Check 중 `.next` 충돌을 줄이고 검증 후 Preview를 복구한다.
- Port 번호만으로 다른 프로젝트의 Node Process를 종료하지 않는다.
- Runtime PID, Lock, Log를 Repository 밖에서 관리한다.

이 운영 자동화는 제품 추천 로직을 변경하지 않습니다.

정상 MyOTT 코드 작업에서는 Founder가 수동 PowerShell을 실행할 필요가 없습니다. 관련 없는 Process, 소유권을 증명할 수 없는 Process, 또는 보안상 검증 불가능한 상태만 사람 개입이 필요한 blocker로 반환합니다.

---

## 2. Port Policy

| 범위 | 용도 | 정책 |
| --- | --- | --- |
| `3000` | Founder Preview | 정확히 `127.0.0.1`에 바인딩하며 자동 증가하지 않음 |
| `3001-3100` | Codex 임시 개발/Smoke | 필요한 동안만 사용하고 작업 종료 시 MyOTT 소유 Server 정리 |
| `3101` | Legacy Cleanup | 기존 MyOTT Server 정리 대상이지만 신규 실행 금지 |
| `3102+` | 금지 | 신규 MyOTT 개발 Server에 사용하지 않음 |

`3000`이 다른 프로그램 또는 소유권을 증명할 수 없는 Process에 의해 점유되면:

1. 해당 Process를 종료하지 않는다.
2. 다른 Port로 자동 이동하지 않는다.
3. PID, Process, Command Line 확인 가능 범위를 보고한다.
4. `BLOCKED_UNRELATED_PROCESS`로 종료한다.

---

## 3. Commands

| Command | Purpose |
| --- | --- |
| `pnpm founder:status` | 현재 3000 상태, 소유권, State, Git, 임시 Listener 확인 |
| `pnpm founder:start` | 3000이 비어 있으면 시작하고, 건강한 기존 MyOTT Server는 유지 또는 adopt |
| `pnpm founder:stop` | 소유권이 확인된 MyOTT Founder Server만 종료 |
| `pnpm founder:restart` | 소유권 확인 후 3000을 재시작 |
| `pnpm founder:ensure` | 건강한 Server 유지, 중지 시 시작, owned unhealthy면 재시작 |
| `pnpm founder:cleanup` | 3001-3101의 MyOTT 소유 Server만 정리 |
| `pnpm founder:verify` | Root와 실제 Recommendation API 검증 |
| `pnpm founder:preflight` | 작업 시작 전 Cleanup, Ensure, Root Smoke 수행 |
| `pnpm founder:finalize` | 작업 종료 시 임시 Server 정리, 3000 재시작, Root/API 검증 |
| `pnpm founder:qa-ready` | Founder QA 직전 clean working tree, Cleanup, 3000 Restart, Root/API를 하나의 gate로 확정 |
| `pnpm founder:build` | Founder Server를 안전하게 다룬 뒤 기존 `pnpm build` 실행 및 복구 |
| `pnpm founder:check` | Founder Server를 안전하게 다룬 뒤 기존 `pnpm check` 실행 및 복구 |
| `pnpm founder:selftest` | 실제 Process를 종료하지 않는 순수 안전 계약 테스트 |

Cleanup 검사만 수행하려면 Dispatcher를 직접 호출합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File scripts/local/founder-preview.ps1 `
  -Action cleanup `
  -DryRun
```

---

## 4. Runtime Architecture

Runtime 파일은 Repository 내부에 생성하지 않습니다. Port 3000은 모든 clone/worktree가 공유하는 전역 자원이고, State와 Log는 Repository Path hash별로 격리합니다.

```text
%TEMP%\myott-founder-preview\
  global\
    lifecycle.lock
  <repository-path-hash>\
    state.json
    last-operation.json
    founder-3000.out.log
    founder-3000.err.log
```

| File | Purpose |
| --- | --- |
| `global/lifecycle.lock` | 전역 Port 3000 Named Mutex 획득 중인 Action과 Owner PID 진단 |
| `<hash>/state.json` | 해당 Repository가 관리 중인 Launcher/Listener, Commit, Log 경로 |
| `<hash>/last-operation.json` | 해당 Repository의 마지막 Action 결과와 Exit Code |
| `<hash>/founder-3000.out.log` | 해당 Repository Next.js stdout |
| `<hash>/founder-3000.err.log` | 해당 Repository Next.js stderr |

State 최소 항목:

- `schemaVersion`
- `repositoryPath`
- `repositoryRemote`
- `branch`
- `commitAtStart`
- `commitAtAdoption`
- `adoptedAt`
- `adoptedExistingServer`
- `requestedHost`
- `requestedPort`
- `launcherPid`
- `launcherStartedAt`
- `listenerPid`
- `listenerStartedAt`
- `startedAt`
- `stateRecordedAt`
- `command`
- `stdoutLog`
- `stderrLog`
- `dependencySourceClassification`
- `dependencySourceRepository`
- `environmentSourceClassification`

State의 PID만으로 Process를 신뢰하지 않습니다. PID, Process Start Time, Repository Path, Next Dev Command, Listener를 함께 확인합니다.

### Git Worktree Runtime Support

Founder Preview의 Application Source와 Working Directory는 항상 실행 대상 worktree입니다. 대상 worktree에 유효한 `node_modules`와 Next runtime이 있으면 `TARGET_LOCAL_DEPENDENCIES`를 사용합니다. 없으면 Git `--git-common-dir`에서 primary worktree를 유도하고, target/source의 common Git directory와 origin remote가 같으며 `next`, `react`, `react-dom` 선언이 정확히 일치하고 실제 설치 버전이 target caret SemVer 범위를 충족할 때만 `SAME_REPOSITORY_SHARED_DEPENDENCIES`를 사용합니다. 지원하지 않거나 malformed/prerelease인 범위와 버전은 호환으로 추정하지 않고 차단합니다.

Shared dependency reuse는 source ownership을 primary worktree로 넘기지 않습니다. Launcher는 target worktree를 Next app directory와 Working Directory로 유지하고 `NODE_PATH`를 child process에만 설정합니다. Worktree에 `node_modules` junction, symlink, copy를 만들거나 dependency install을 수행하지 않습니다.

Environment source는 target `.env.local`이 우선입니다. Target에 없고 동일 Git repository의 primary worktree에 `.env.local`이 있을 때만 Node child process의 env-file로 사용합니다. 파일은 복사하지 않고 경로 존재와 classification만 기록하며 secret 값은 State, Log, Console에 출력하지 않습니다.

Shared runtime의 final listener command가 dependency worktree만 가리키더라도 listener의 canonical ancestor chain에서 단일 proving launcher가 exact target repository path와 Next dev command를 같은 Process Command Line으로 함께 증명할 수 있습니다. 여기서 Next dev command는 현재 lifecycle이 생성하는 Node 실행 파일, 검증된 target-local 또는 same-repository shared runtime의 exact `node_modules\next\dist\bin\next` 경로, exact `dev` argument가 token boundary로 일치하는 형식만 뜻합니다. 임의 command text에 `next`와 `dev`가 포함된 것만으로는 증거가 되지 않으며, direct Next executable, pnpm, cmd wrapper 형식은 현재 lifecycle의 canonical form으로 허용하지 않습니다. Malformed 또는 ambiguous command line은 fail-closed합니다.

Application source ownership은 parsed `next dev` positional application-directory argument가 target repository root와 정확히 일치할 때만 성립합니다. `--env-file`, shared dependency root, log path 또는 다른 option value에 target path가 존재하는 것은 application source 증거가 아닙니다. Canonical launcher는 application directory를 명시하며 implicit working directory를 ownership 근거로 사용하지 않습니다.

서로 다른 Process의 path/Next boolean을 합치지 않습니다. Listener는 proving launcher 자신이거나 검증된 descendant여야 하며 State의 launcher/listener PID와 Start Time, target repositoryPath, requested host/port가 모두 일치해야 합니다. 하나라도 불일치하거나 ancestry를 증명할 수 없으면 fail-closed합니다.

기존 `%TEMP%\myott-founder-preview\state.json`은 현재 Repository 경로, Listener PID, Start Time, Process ownership이 모두 유효할 때만 Repository별 경로로 migration합니다. 다른 Repository의 Legacy State는 이동하거나 삭제하지 않습니다. Migration은 반복 실행해도 같은 결과가 나와야 하며, 새 Server가 Repository별 Log로 정상 시작된 뒤에만 현재 Repository의 Legacy Log를 정리합니다.

---

## 5. Process Ownership

MyOTT 소유 Process로 판정하려면 다음 근거가 함께 필요합니다.

- Listener 또는 Ancestor Command Line에 현재 Repository 절대 경로 또는 Repository 내부 실행 경로가 argument 경계에 맞게 존재한다.
- Process Tree에 `next dev`, `pnpm dev`, 또는 Repository 내부 Next.js start-server 경로가 존재한다.
- Managed State가 있으면 Listener PID와 Start Time이 State와 일치한다.

Repository 경로는 단순 부분 문자열로 비교하지 않습니다. 현재 경로가 `...\Myott`라면 `Myott-copy`, `Myott-old`, `Myott-test`, `Myott2`, `MyottBackup`은 현재 Repository 소유가 아닙니다. Backslash와 forward slash 표현은 모두 지원하지만, 경로 바로 뒤에 문자, 숫자, `-`가 이어지는 prefix collision은 거부합니다.

다음 정보만으로는 소유권을 인정하지 않습니다.

- Process 이름이 `node.exe`
- Command가 `next dev`
- Port가 `3000-3101`
- State에 PID가 기록됨

금지:

- `Stop-Process -Name node`
- `taskkill /IM node.exe`
- Port-only kill
- 소유권 검증 없는 Process Tree 종료
- 다른 Repository Process 종료

Process metadata를 읽을 수 없으면 안전을 우선해 `BLOCKED` 또는 `UNOWNED`로 처리합니다.

Metadata source 하나의 실패가 다른 source에서 독립적으로 검증된 증거를 무효화하지는 않습니다. 예를 들어 CIM 조회가 `AccessDenied`여도 approved runtime API나 kernel-backed 조회에서 얻은 유효한 Process identity, executable path, command line 증거는 각각 유지합니다. 다만 필수 ownership evidence가 하나라도 없거나 모순되면 최종 소유권 판정은 계속 fail-closed합니다.

Process 생성 identity는 exact canonical value로 비교하며 시간 허용 오차를 ownership 근거로 사용하지 않습니다. Windows command line은 native argv semantics로 해석한 뒤 현재 lifecycle이 허용하는 strict canonical argument subset만 인정합니다. 실제 Node `ExecutablePath`는 승인된 runtime과 정확히 일치해야 하며, application source는 positional Next application-directory argument가 target repository root와 정확히 일치할 때만 증명됩니다.

Process 종료는 검증 시점의 kernel process identity에 묶습니다. 종료 직전에 identity를 다시 확인하며, PID가 재사용됐거나 creation identity가 달라진 Process로 대상을 재지정하지 않습니다. unrelated 또는 ownership이 증명되지 않은 Process는 절대 종료하지 않습니다.

---

## 6. Start, Stop, Restart

### Start

`founder:start`는 idempotent합니다.

- `RUNNING_MANAGED`: 새 Process를 만들지 않음
- `RUNNING_OWNED_UNMANAGED`: Root가 건강하고 소유권이 확인되면 TEMP State에 adopt
- `STOPPED`: 정확히 `127.0.0.1:3000`으로 시작
- `BLOCKED_UNRELATED_PROCESS`: 종료하거나 Port를 변경하지 않음

Background Process에는 기존 `NODE_OPTIONS`를 유지하면서 `--use-system-ca`를 한 번만 추가합니다. Parent 또는 User 환경변수를 영구 변경하지 않습니다.

직접 시작한 Server는 `commitAtStart`에 실제 Start 시점 HEAD를 기록합니다. 기존 Server를 adopt할 때 시작 Commit을 증명할 수 없으면 `commitAtStart`를 비우고 `commitAtAdoption`, `adoptedAt`, `adoptedExistingServer: true`를 기록합니다.

### Stop

`founder:stop`은 Managed 또는 Owned MyOTT Process만 종료합니다. 이미 중지된 상태는 성공으로 처리합니다.

### Restart

`founder:restart`는 Owned Server를 종료한 뒤 정확히 3000으로 다시 시작합니다. 실패 시 다른 Port로 이동하지 않습니다.

---

## 7. Temporary Cleanup Contract

`founder:cleanup`은 `3001-3101`을 조사하며 `3000`과 `3102+`는 Cleanup 대상에 포함하지 않습니다.

결과 목록:

- `Stopped`: ownership 확인 후 종료되고 Listener 제거까지 확인된 Process
- `WouldStop`: Dry Run에서 종료 대상으로 판정된 Process
- `Failed`: ownership은 확인됐지만 종료 또는 안전 검증에 실패한 Process
- `Unrelated`: 현재 Repository 소유가 아니거나 ownership을 증명할 수 없어 유지한 Process
- `RemainingOwned`: Cleanup 후 재조회에서도 남은 현재 Repository 소유 Listener
- `RemainingUnrelated`: Cleanup 후 남아 있는 다른 Repository 또는 ownership 불명 Listener

Cleanup은 Process 종료 API의 성공만 믿지 않고 `3001-3101`을 다시 조회합니다. `Failed` 또는 `RemainingOwned`가 하나라도 있으면 `CLEANUP_FAILED`, Exit Code `9`이며 성공으로 축소하지 않습니다. Unrelated Listener만 남으면 Process를 유지하고 Cleanup 자체는 성공할 수 있습니다.

---

## 8. Preflight

모든 Codex 코드 작업 시작 시:

```powershell
pnpm founder:preflight
```

순서:

1. Lifecycle Lock 획득
2. Branch, Commit, Working Tree 기록
3. Cleanup Dry Run 진단
4. 3001-3101 Actual Cleanup
5. Cleanup Success와 Remaining Owned 0 강제 확인
6. 3000 Ensure
7. Root HTTP Smoke
8. `RUNNING_MANAGED`와 정확한 binding 확인
9. 최종 Port 상태 확인
10. Lock 해제

Cleanup 실패나 Owned Temporary Listener 잔류는 warning으로 낮추지 않습니다. 다른 프로그램 Listener만 남으면 유지하고 `READY_WITH_WARNINGS`로 보고합니다.

---

## 9. Finalize

모든 Codex 코드 작업 종료 시:

```powershell
pnpm founder:finalize
```

순서:

1. 3001-3101 Owned MyOTT Server 정리
2. Cleanup Success와 Remaining Owned 0 강제 확인
3. 3000 Founder Preview 재시작
4. Root HTTP 200 확인
5. Recommendation API HTTP 200 확인
6. TMDB source, fallback false, Mock 혼합 0, 결과 8개 이상 확인
7. `RUNNING_MANAGED`, binding, 현재 Branch/Commit/Working Tree 기록
8. 3000 Server를 실행 상태로 유지

Finalize Restart 뒤 브라우저의 Next.js Dev Client가 다시 연결할 수 있습니다. OS 수준의 강제 Browser Refresh는 사용하지 않습니다.

Cleanup 실패, Remaining Owned Listener, Restart 실패, Verify 실패 중 하나라도 있으면 `FINALIZED`를 반환하지 않습니다.

---

## 10. Founder QA Ready

Founder가 브라우저 QA를 시작하기 직전에 실행합니다.

```powershell
pnpm founder:qa-ready
```

순서:

1. 전역 Port 3000 Lifecycle Lock 획득
2. Branch, Commit, Working Tree 확인
3. Working Tree allowlist gate
4. 3001-3101 Cleanup 및 Remaining Owned 0 확인
5. 3000 Restart
6. 현재 Commit으로 시작된 `RUNNING_MANAGED` 확인
7. Root/API Verify
8. 최종 Port와 QA Session Summary 출력
9. 3000 Server 실행 유지

허용되는 Working Tree 항목은 다음 두 untracked 파일뿐입니다.

```text
?? docs/project/QA_CHECKLIST.md
?? docs/project/QA_CHECKLIST.pdf
```

Tracked/Staged 변경이나 다른 untracked 파일이 있으면 파일을 수정하거나 삭제하지 않고 `BLOCKED_DIRTY_WORKTREE`, Exit Code `10`으로 중단합니다. 성공 시 `READY_FOR_FOUNDER_QA`와 URL, Commit, PID, Root/API, Provider, fallback, 결과 수, Temporary Listener, Log 경로를 출력합니다.

---

## 11. Safe Build and Check

### Build

```powershell
pnpm founder:build
```

- Owned Founder Server를 일시 중지한다.
- 기존 `pnpm build`를 실행한다.
- 성공과 실패에 관계없이 `finally` 성격의 복구 단계에서 3000을 다시 보장한다.
- Root Smoke를 확인한다.
- Build가 실패하고 Server 복구가 성공하면 원래 Build Exit Code를 반환한다.

### Check

```powershell
pnpm founder:check
```

- 기존 `pnpm check`를 호출한다.
- `founder:check`를 재귀 호출하지 않는다.
- 검증 뒤 3000을 복구한다.
- Root/API Verify를 수행한다.
- Check가 실패하고 Server 복구가 성공하면 원래 Check Exit Code를 반환한다.

Validation과 Server 복구가 모두 실패하면 복구 실패 Exit Code를 반환하고 `last-operation.json`에 두 결과를 분리해 기록합니다.

---

## 12. Lifecycle Lock

변경 Action은 모든 clone/worktree가 공유하는 Windows Named Mutex `Local\MyOTTFounderPreview_Port3000`을 사용합니다. State와 Log는 Repository별로 분리하지만 Port 3000 mutation은 전역으로 직렬화합니다.

- 기본 대기 시간: 30초
- Lock 정보: `%TEMP%\myott-founder-preview\global\lifecycle.lock`
- 예외 발생 시 `finally`에서 해제
- Process가 비정상 종료되면 Windows Mutex abandoned 상태를 다음 실행이 안전하게 회수
- Lock 획득 실패 시 Process를 종료하지 않음

`status`와 `verify`는 Process를 변경하지 않으므로 lifecycle mutation lock을 획득하지 않습니다.

---

## 13. Status Values

| Status | Meaning |
| --- | --- |
| `RUNNING_MANAGED` | State와 Listener identity가 일치하는 건강한 MyOTT Server |
| `RUNNING_OWNED_UNMANAGED` | MyOTT 소유가 확인됐지만 State가 없는 건강한 Server |
| `STOPPED` | 3000 Listener와 State가 없음 |
| `BLOCKED_UNRELATED_PROCESS` | 3000 Process 소유권을 MyOTT로 증명할 수 없음 |
| `UNHEALTHY_OWNED` | MyOTT 소유지만 Root Health 실패 |
| `STALE_STATE` | State는 있으나 Listener가 없거나 identity가 불일치 |
| `PORT_CONFLICT` | 3000을 안전하게 사용할 수 없음 |
| `UNKNOWN` | 진단 정보가 부족한 예외 상태 |

---

## 14. Exit Code Contract

| Code | Meaning |
| --- | --- |
| `0` | PASS 또는 idempotent no-op |
| `1` | 일반 작업 실패 |
| `2` | 3000이 다른 또는 소유권 불명 Process에 의해 점유 |
| `3` | Owned MyOTT Server unhealthy |
| `4` | Process ownership 확인 불가 |
| `5` | Root/API Smoke 실패 |
| `6` | Lifecycle Lock timeout |
| `7` | Validation 실패, Server 복구 성공을 표현하는 예약 코드 |
| `8` | Validation 또는 복구 단계 실패와 Server 복구 실패 |
| `9` | Temporary MyOTT Cleanup 실패 또는 Remaining Owned Listener 존재 |
| `10` | Founder QA Ready가 dirty working tree로 차단 |

Safe Build/Check는 원래 검증 명령의 Exit Code 보존을 우선합니다. 따라서 검증이 실패하고 Server가 정상 복구되면 Process Exit Code는 원래 `pnpm build` 또는 `pnpm check`의 Exit Code이며, 상태는 `VALIDATION_FAILED_SERVER_RESTORED`로 기록됩니다.

---

## 15. HMR and Browser Reconnection

일반 코드 변경:

- Next.js Fast Refresh/HMR 사용
- Founder Preview를 계속 실행
- 브라우저 탭에서 자동 반영 기대

Restart가 필요한 변경:

- `package.json`
- Dependency 또는 lockfile
- 환경변수
- `next.config`
- Server initialization
- HMR 복구 불가 오류
- Build 이후 Dev Server 복구

금지:

- 키보드 입력을 보내는 Browser Automation
- 모든 Browser Window 강제 새로고침
- Browser Process 강제 종료
- 위험한 Tab 탐색 UI Automation

---

## 16. Verify Contract

Root:

```text
GET http://127.0.0.1:3000
```

Recommendation API:

```text
GET http://127.0.0.1:3000/api/recommend/options?filters=genre-action&types=drama
```

PASS 조건:

- Root HTTP 200
- HTML response 존재
- API HTTP 200
- JSON parse 가능
- Provider 또는 Data Source가 `tmdb`
- `fallbackUsed` false
- Mock source 결과 0
- 결과 8개 이상
- TLS/certificate 오류 없음

외부 Provider 변동으로 결과 수가 부족하면 HTTP, Provider, 결과 수, Log를 구분해 보고합니다. Fixture 결과로 Live API PASS를 대체하지 않습니다.

---

## 17. Troubleshooting

### `BLOCKED_UNRELATED_PROCESS`

1. `pnpm founder:status`
2. PID와 Command Line 확인
3. 다른 프로그램이면 유지
4. 소유권을 사람이 확인하기 전 종료 금지

### `STALE_STATE`

`pnpm founder:ensure`가 stale State를 제거하고 Port를 다시 조사합니다.

### Ready timeout

다음 Log를 확인합니다.

```text
%TEMP%\myott-founder-preview\<repository-path-hash>\founder-3000.out.log
%TEMP%\myott-founder-preview\<repository-path-hash>\founder-3000.err.log
```

Start Action이 생성한 MyOTT Process만 정리하며 다른 Port로 이동하지 않습니다.

### TLS error

- State의 command와 Next Process가 `NODE_OPTIONS=--use-system-ca`를 상속했는지 확인
- `.env.local`을 자동 수정하지 않음
- User/System 환경변수를 자동 변경하지 않음

### PowerShell process metadata access denied

하나의 metadata provider가 `AccessDenied`를 반환해도 다른 approved source에서 독립적으로 검증된 증거는 유지합니다. 필수 ownership evidence가 끝내 부족하거나 source 간 모순이 있으면 안전하게 `BLOCKED` 처리합니다. 권한을 우회하거나 관리자 권한을 자동 요청하지 않습니다.

---

## 18. Known Limitations

- TEMP State와 Cache는 Windows 사용자 세션 및 임시 디렉터리 정리에 따라 사라질 수 있습니다.
- Global Named Mutex는 같은 Windows 사용자 환경의 clone/worktree 간 Port 3000 mutation을 방어합니다.
- 브라우저의 Next.js 재연결은 브라우저/네트워크 상태에 따라 수동 새로고침이 필요할 수 있습니다.
- Process metadata 조회 일부가 제한돼도 독립적으로 검증된 evidence slot은 유지하지만, required ownership contract를 완성하지 못하면 자동 adopt/stop보다 안전한 BLOCKED 상태를 선택합니다.
- Linked worktree shared runtime은 같은 Git common directory, 같은 origin, 동일 dependency declaration, target SemVer 범위를 충족하는 실제 설치 runtime이 모두 확인될 때만 허용합니다.
- Production Process Manager, Windows Service, Startup 등록은 범위 밖입니다.

---

## 19. Codex Prompt Standard

다음 문구를 이후 MyOTT Codex Task Prompt에 재사용합니다.

```text
Codex Task Preflight:

- Run `pnpm founder:preflight`.
- Keep the Founder Preview available on `127.0.0.1:3000`.
- Use only ports `3001-3100` for temporary Codex servers.
- Never allocate port `3101` or above.
- Do not terminate processes unless MyOTT repository ownership is verified.

During Development:

- Use Next.js Fast Refresh for ordinary code changes.
- Restart Founder Preview only when configuration, environment, dependency, or server initialization changes require it.

Validation:

- Use `pnpm founder:check` instead of directly leaving the Founder server stopped around `pnpm check`.

Task Finalization:

- Run `pnpm founder:finalize`.
- Close MyOTT temporary servers in `3001-3101`.
- Leave `127.0.0.1:3000` running.
- Report Root HTTP, API HTTP, Provider, Result Count, Listener PID, and final port state.

Founder QA Handoff:

- Run `pnpm founder:qa-ready` after the task commit.
- Allow only the two local QA Checklist files.
- Require `READY_FOR_FOUNDER_QA` at the current commit.
- Leave `127.0.0.1:3000` running for Founder testing.
```

## 20. Network-Zero Lifecycle Inspection

Network-zero QA에서는 Founder Preview의 HTTP health check를 실행하지 않고도
현재 lifecycle과 소유권을 확인할 수 있어야 합니다. 다음 순서는 Product,
TMDB, API, Browser/CDP 요청을 만들지 않는 읽기 중심 점검입니다.

1. Repository/worktree identity와 변경 범위를 읽기 전용으로 확인합니다.
2. State JSON, listener, process ownership metadata를 OS 조회로 확인합니다.
3. `pnpm founder:selftest`를 실행합니다. 이 self-test는 계약과 안전 조건만
   검사하며 Root 또는 Product API를 호출하지 않습니다.
4. 임시 서버 정리가 필요할 때는
   `scripts/local/founder-preview.ps1 -Action cleanup -DryRun`으로 먼저
   소유권과 대상만 확인합니다. `-DryRun`은 process termination을 수행하지
   않습니다.

`founder:status`, `founder:preflight`, `founder:ensure`, `founder:finalize`,
`founder:verify`, `founder:qa-ready`, `founder:check`, `start`, `restart`,
`build`, `check`는 listener가 존재하는 경우 Root 또는 Product API health
check를 포함할 수 있습니다. 따라서 이 명령들은 Network-zero 증거로 사용하지
않습니다. Preview가 실제로 HTTP로 검증되어야 하는 별도 QA에서는 해당 HTTP
호출을 명시적으로 기록하고 Network-zero 분류와 섞지 않습니다.

이 절차는 실행 중인 `127.0.0.1:3000` Preview를 재시작하거나 종료하지 않으며,
소유권이 확인되지 않은 process를 종료하지 않습니다. Product/TMDB 요청,
외부 Network, Browser/CDP, source mutation은 이 점검에 포함되지 않습니다.

## 21. Canonical Port Lifecycle

`127.0.0.1:3000`은 최신 권위 있는 Product working tree를 제공하는
지속 Founder Preview/Product 개발 서버입니다. 현재 Product 결함이나 미완성 UI는
허용하지만 서버 중단이나 오래된 source를 정상 상태로 취급하지 않습니다.
필요한 재시작은 같은 lifecycle 안에서 현재 working tree로 복구해야 합니다.

`3001-3100`은 실제 임시 테스트가 필요할 때만 할당하는 Codex test pool입니다.
사용하지 않는 점유 Port를 자동으로 빼앗지 않으며, 작업의 성공·실패·중단과
관계없이 MyOTT/Codex 소유 임시 listener를 종료합니다. listener를 종료하기
전에는 PID, process identity, command line, repository/root 및 가능한 parent
관계를 확인해 소유권을 입증합니다. unrelated 또는 소유권을 입증할 수 없는
process는 그대로 두고 별도로 보고합니다.

## 22. User-Session Self-Healing Supervisor

승인된 V1R1 Supervisor가 설치된 환경에서는 이 절이 이전 direct lifecycle의
start/ensure/preflight/finalize/stop/restart/build 동작보다 우선합니다.
실제 활성화 여부는 `supervisor-status`와 설치·이전 검증 결과로 판단합니다.
문서 존재만으로 이전 완료나 자동 복구 PASS를 선언하지 않습니다.

- 새 예약 작업 이름은 `MyOTT-FounderPreview-3000`입니다. 현재 사용자 Interactive
  Logon, Limited 권한, AtLogOn 및 같은 Task의 PT1M 무기한 time trigger, IgnoreNew를 사용합니다. 비밀번호,
  관리자, Windows Service, 로그인 전 실행, 네트워크 선행 조건,
  WakeToRun은 사용하지 않습니다. Supervisor 실패 재시작은 1분 간격 최대 3회이며
  실행 시간 제한은 없습니다. StartWhenAvailable은 활성화합니다.
- 안정 설치 위치는 `%LOCALAPPDATA%\MyOTT\FounderPreview\bin\`입니다.
  `FounderPreview.Supervisor.ps1`, 검토된 `FounderPreview.Common.ps1`,
  `FounderPreview.SupervisorLauncher.vbs`를 정확한 hash manifest로 설치합니다.
  source/installed SHA-256은 installation manifest로 검증합니다. 일반 명령은 설치
  파일을 자동 갱신하지 않습니다. 손상·누락·Task 정의 불일치는 fail closed입니다.
- 명시적인 `scripts/local/founder-preview.ps1 -Action supervisor-install`은 새 Task를
  **비활성 상태로 준비**합니다. 기존 Task 갱신은 정확한 Task 비활성화 및 소유 Supervisor 종료
  확인 후에만 파일과 action을 갱신하며 기존 trigger를 보존합니다. 기존 관리자와 공존 실행하지 않습니다. 승인된
  legacy handover 완료 후 `-Action supervisor-activate`로 활성화합니다.
- Legacy `MyOTT-Founder-Preview-3000`과 `founder-preview-watchdog.ps1`은 새 관리자
  활성화 전에 정확한 사용자/command/시작시각을 확인합니다. 원본 Task 정의와
  script hash를 보존하고 자동시작을 먼저 비활성화한 뒤 watchdog root만 종료합니다.
  canonical runtime과 소유권 불명 descendant는 종료하지 않습니다. 이 전환 충돌이
  과거 모든 3000 종료의 직접 원인이었다는 뜻은 아닙니다.
- named mutex와 user-session control event를 사용합니다. 정상 상태는 blocking wait,
  60초 health timer, HTTP timeout 10초입니다. root `127.0.0.1:3000/`만 확인하며
  proxy와 redirect를 사용하지 않습니다. Product API/TMDB 요청은 하지 않습니다.
- HTTP 200은 HEALTHY, 실제 3xx/4xx/5xx(컴파일 오류 HTTP 500 포함)는
  DEGRADED_BUT_RESPONSIVE입니다. 응답 있는 서버는 health 실패로 재시작하지 않습니다.
  transport 실패만 T+0/+5/+15 확인 후 정확한 소유권을 재검증합니다.
- exact process handle의 종료는 timer 전에 대기를 깨웁니다. 복구 backoff는
  2/10/30초, 재시작 예산은 10분 내 최대 3회입니다. 초과 시 살아 있는 Supervisor가
  SAFE_HOLD에서 blocking wait합니다. 아래 사유별 재평가 계약 없이 hold를 해제하지 않습니다.
  명시적 start/ensure 또는 새 candidateRoot의 budget epoch 변경도 보안 hold와 restart 이력을 삭제하지 않습니다.
- candidateRoot 변경은 명시적 명령, 증가한 generation, 같은 볼륨의 atomic JSON
  replacement, event signal로만 수행합니다. 다른 worktree를 자동 선택하지 않습니다.
  같은 root의 source/HEAD 변경은 주기적 Git/hash 조사나 자동 재시작을 유발하지 않습니다.
- ensure/preflight/finalize/start는 원하는 후보를 RUNNING으로 게시하고 Supervisor와
  Task를 활성화하고 root transport를 확인합니다. stop은 먼저 persistent STOPPED를 atomic 게시한 뒤
  정확한 Task를 비활성화합니다. Supervisor가 없으면 소유권 검증된 runtime만 정지합니다. restart는 Supervisor에
  정확한 runtime 재시작을 요청합니다. 기존 runtime이 exact-owned/responsive이면
  불필요하게 재시작하지 않고 인수합니다.
- build는 최대 15분 maintenance lease 동안 정지하며 finally에서 RUNNING을 복원합니다.
  호출자가 죽으면 lease가 만료되어 복구 억제가 끝납니다. `pnpm check`와
  `pnpm qa:recommendation` 금지는 유지하며 supervised check는 실행을 거부합니다.
- PID뿐 아니라 root, executable, command, 시작시각, 열린 process handle과 generation을
  사용합니다. unknown listener는 SAFE_HOLD이며 port-only/global process kill은 금지입니다.
- 의미 있는 상태 전이만 로그에 기록하며 정상 성공 probe 로그는 0입니다. health probe마다
  bounded status를 갱신하므로 정상 state write는 분당 최대 한 번입니다. probe가 억제된
  STOP/SAFE_HOLD 상태의 heartbeat는 10분 간격입니다. 새 Supervisor 로그는 현재/이전 각 최대 4 MiB로 회전합니다.
  새 runtime stdout/stderr는 drain 후 폐기하며 raw error, .env, credential을 저장하지 않습니다.
  기존 legacy 증거 파일은 회전/삭제 대상이 아닙니다.
- `-Action supervisor-status`는 설치/hash/Task와 bounded status를 읽고 PID 시작시각,
  executable, installed command 및 Task Running을 대조합니다. 죽은 PID는
  SUPERVISOR_NOT_RUNNING, 실행 중 PID와 Ready Task의 조합은 TASK_OWNERSHIP_NOT_PROVEN입니다.
  마지막 완료 probe가 없거나 75초보다 오래되면 HEALTH_NOT_CURRENT입니다. 원본 state 파일의
  HEALTHY만으로 현재 건강 상태를 판정하지 않습니다. lastProbeStartedAt/CompletedAt,
  lastSuccessAt, HTTP 결과, 실패 횟수, 다음 확인 시각을 기록하며 timeout 확인 중에도 갱신합니다.
  Task action은 blocking VBS launcher를 소유하며 launcher는 long-lived Supervisor 종료까지
  동기 대기합니다. detached bootstrap은 허용하지 않습니다.
  명령 세션 독립 생존, 1회 장애 자동복구, 10분 저부하 관찰은
  별도의 실제 설치 acceptance입니다.
- `-Action supervisor-uninstall`은 정확한 새 Task와 새 bin/state 파일만 제거합니다.
  전체 FounderPreview 폴더, legacy script/증거, Product/FM/DEP 자료는 지우지 않습니다.
  이전 후보를 관리하는 legacy watchdog은 자동 재활성화하지 않습니다. 이전 실패 시
  SAFE_HOLD하고 승인된 direct lifecycle로 되돌리는 판단을 별도로 합니다.
- package.json/pnpm-lock.yaml 및 FM staged index는 이 설치의 쓰기 대상이 아닙니다.

### Supervisor lifetime and failure evidence

The scheduled action owns a blocking launcher that executes the installed Supervisor synchronously. Desired RUNNING
must not return normally: an unexpected return exits 21, a handled top-level fatal
error exits 22, and duplicate-instance rejection exits 23. Only a validated explicit
STOPPED/UNINSTALL completion may exit 0. STOPPED and maintenance normally keep the
Supervisor resident; maintenance expiry and health timing retain their existing contract.
Task Scheduler owns the configured one-minute, three-attempt failure restart policy.
No detached bootstrap or independent watchdog is part of this contract.

### SAFE_HOLD provenance and bootstrap recovery (schema 2)

- `desiredState` (`RUNNING` / `STOPPED`) and `containmentState` (`NORMAL` /
  `SAFE_HOLD` / `RECOVERY_PENDING`) are separate. A RUNNING request is not permission
  to ignore containment. Reboot does not reset containment or restart accounting.
- Every new hold records an explicit reason: `OWNERSHIP_CONFLICT`,
  `STATE_CORRUPTION`, `RESTART_BUDGET_EXHAUSTED`, `RUNTIME_IDENTITY_AMBIGUOUS`,
  `INSTALLATION_INTEGRITY_FAILURE`, or `LEGACY_REASON_MISSING`. Ownership,
  corruption, identity and installation holds never automatically clear.
- Status schema 2 records revision, entry time, generation, candidate, installed
  manifest SHA, restart timestamps, bounded hold history and migration progress.
  Existing reasonless holds migrate idempotently to `LEGACY_REASON_MISSING`.
  Their original structured record is preserved; original cause remains
  `NOT_PROVEN`, and an unavailable original entry time remains null.
- A legacy/budget hold can be reevaluated on initial migration, desired generation
  or budget-epoch transition, installed identity repair, lease expiry, or an exact
  rolling-window count change. Identical PT1M task repetitions do not re-run a
  blocked evaluation. Ownership changes require a corresponding explicit control
  generation transition; no new ownership polling loop is installed.
- An active, unexpired maintenance lease is an outer firewall for SAFE_HOLD
  reevaluation. Generation, evaluation-key, dependency or install changes during
  the lease do not collect recovery conditions, change migration decisions, enter
  `RECOVERY_PENDING`, reserve bootstrap, or recover a runtime. This remains true
  when the Supervisor restarts and restores the lease. Lease bookkeeping,
  lifecycle identity/checkpoints, bounded heartbeat/status persistence and control
  wake accounting may change; `safeHoldReason`, `legacyMigrationStatus`,
  `evaluationKey`, `recoveryChecks`, `containmentState`, `bootstrapAttempts`,
  `pageReadiness`, restart accounting and runtime identity may not change as a
  reevaluation decision while the lease is active.
- Lease expiry or explicit clear is the material transition that permits one fresh
  reevaluation against the fully installed post-maintenance state. No compatibility
  result computed before or during maintenance is reused. The unchanged material
  key suppresses subsequent PT1M repetitions after that evaluation.
- Restart accounting stays at three within rolling ten minutes. Expired timestamps
  permit reevaluation, not unconditional clearing. A valid enabled Task, one exact
  blocking launcher/Supervisor pair, exact source repository and install identity,
  clear lease, empty listener/runtime state, available budget, and compatible
  existing dependencies are all required. No install or alternate runtime is used
  to bypass a failed precheck. The first failed check is persisted as
  `BLOCKED_<EXACT_REASON>`.
- Successful checks move SAFE_HOLD to RECOVERY_PENDING. Checks run again before a
  durable one-shot bootstrap reservation and restart timestamp are committed.
  Only the canonical runtime path may then start once. An interrupted reservation
  becomes `BLOCKED_BOOTSTRAP_INTERRUPTED`; it is never replayed after a crash.
- NORMAL/COMPLETED requires root HTTP 200 and representative CSS/JS 200 from that
  exact root HTML, with loopback-only, proxy-free, non-redirecting bounded requests.
  Failed page readiness remains contained without another bootstrap. Hold history
  is retained. Normal 60-second health and T+0/+5/+15 failure behavior are unchanged.
- Canonical JSON writes use a same-directory unique temporary file, explicit disk
  flush/close, and atomic replace/move. Partial/invalid state fails closed as
  STATE_CORRUPTION. Raw process output, credentials and provider data are not state.
- Manual ensure is not normal recovery. A future Founder-selected reboot must
  prove within 90 seconds of login: Task Running, one launcher/Supervisor/runtime,
  no visible task console, desired RUNNING, containment NORMAL unless a new explicit
  safety hold, exact candidate, and root/CSS/JS 200, with manual ensure count zero.

`state/supervisor-lifecycle.json` records the owning PID/start identity, generation,
candidate, desired state, execution checkpoint and planned/final exit classification.
The bounded status snapshot also carries the most recent health/control checkpoint.
A previous attempt with no final record is suspected abrupt termination; it does not
identify the external actor. A duplicate that did not acquire the mutex cannot replace
the owner's lifecycle evidence. Raw exception messages and credentials are not recorded.
Status readback checks current desired generation as well as process and Task identity.

Run focused regressions with `founder-preview.selftest.ps1 -SupervisorOnly`. Live
acceptance additionally requires exact-owned Supervisor failure recovery through Task
Scheduler, independent-command survival and healthy scheduled intervals. Configuration
alone, or a cached HEALTHY state, is not proof of effective failure recovery.

### Periodic task reconciliation and transition-only page readiness

The Founder-approved periodic reconciliation contract supersedes the previous prohibition
on repeated triggers. The existing task retains AtLogOn and adds one TimeTrigger with
PT1M repetition, no Duration, and StopAtDurationEnd=false. This also covers the current
already logged-in session. IgnoreNew prevents concurrent action instances; the Supervisor
mutex remains the independent single-instance guard. RestartOnFailure remains PT1M/3.
No second task, detached launcher, extra watchdog, or elevated principal is used.

Only explicit installation updates the stable binaries. Disable the exact task first,
revalidate and stop only its exact owned Supervisor if running, install/hash-verify, then
enable/start the same task. Runtime processes are not stopped merely for this update.
Ordinary build maintenance continues to use the bounded lease, not persistent STOPPED.

Root HTTP 200 proves transport health, not Founder Preview readiness. At start/recovery
and final QA-ready validation only, read the exact localhost HTML and verify representative
same-origin CSS and JS references when present. Never follow third-party URLs or add
asset polling to the 60-second health loop. Asset timeout is PARTIAL_RUNTIME_STALL;
actual asset 4xx/5xx is DEGRADED_BUT_RESPONSIVE and does not trigger a restart.
FOUNDER_PREVIEW_READY requires PAGE_READINESS_PASS. A page-readiness failure can remain
separate from a proven periodic-reconciliation acceptance.

### Hidden blocking Windows compatibility launcher

CURRENT: VBS is an accepted local Windows compatibility bridge for Windows Terminal
visibility behavior, not a permanent architecture. The existing task executes
`C:\Windows\System32\wscript.exe //B //Nologo "<installed-bin>\FounderPreview.SupervisorLauncher.vbs"`.
The launcher accepts no arguments, starts only the fixed installed PowerShell host and
Supervisor with `-Mode Run`, and uses `WScript.Shell.Run(command, 0, True)`.
It remains alive until the Supervisor exits and returns that exact exit code. Internal
launcher failures exit 80/81 without modal UI; no polling, health loop or success log is added.
Task Scheduler owns the launcher; the launcher owns one Supervisor. Existing trigger,
principal, restart and runtime-health contracts remain unchanged.

Explicit migration uses `Install-FpsSupervisor -MigrateLauncher` only after the exact
task is disabled and its proven Supervisor has exited. The old two-file installation
and direct PowerShell action are accepted only for this migration preflight. Normal
validation requires all three installed hashes and the exact wscript action. An existing
installation update preserves desired generation, restart budget and task triggers.

Visible-console verification enumerates WindowsTerminal top-level windows and correlates
PseudoConsoleWindow owner/root-owner handles to shell PIDs. A zero shell MainWindowHandle
does not prove invisibility. Shared user Terminal hosts must never be terminated wholesale.

FUTURE: replace this bridge with a supported no-console blocking launcher if Microsoft
removes or disables VBScript on the target Windows installation. No replacement is
implemented or installed by this compatibility task.
