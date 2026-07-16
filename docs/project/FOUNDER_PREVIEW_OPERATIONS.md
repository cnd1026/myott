# Founder Preview Operations

Version: 1.1

Last Updated: 2026-07-17

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

State의 PID만으로 Process를 신뢰하지 않습니다. PID, Process Start Time, Repository Path, Next Dev Command, Listener를 함께 확인합니다.

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

소유권 메타데이터를 읽을 수 없는 환경에서는 안전하게 BLOCKED 처리됩니다. 권한을 우회하거나 관리자 권한을 자동 요청하지 않습니다.

---

## 18. Known Limitations

- TEMP State와 Cache는 Windows 사용자 세션 및 임시 디렉터리 정리에 따라 사라질 수 있습니다.
- Global Named Mutex는 같은 Windows 사용자 환경의 clone/worktree 간 Port 3000 mutation을 방어합니다.
- 브라우저의 Next.js 재연결은 브라우저/네트워크 상태에 따라 수동 새로고침이 필요할 수 있습니다.
- Process Command Line 조회 권한이 제한되면 자동 adopt/stop보다 안전한 BLOCKED 상태를 선택합니다.
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
