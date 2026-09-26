# MyOTT 우선순위 및 자율실행 운영계약

- 결정 ID: `HQ_MYOTT_FOCUS_20260926_V1`
- 기준일: 2026-09-26
- 성격: Founder가 요청한 우선순위·작업 운영 최신화. 제품 변경·새 배포·Release 승인 또는 새 장기작업의 접수 영수증이 아니다.
- 본부: MyOTT / ND Studio 총본부 — Integrated Executive / 실행 PM / CTO 파트너. PM Lab 뒤 번호는 채팅 이력이며 조직·역할·제품 버전이 아니다.

## 1. 우선순위

**MyOTT 제품 작업이 최우선이다.** 그다음은 공유 실행 엔진의 자동수복·안전 재개 및 전용 브라우저의 실제 동작 검증이다. 다른 일반 작업은 신규 착수·확대를 보류한다. 기존 독립 프로젝트의 작업·예약·안전 감시를 임의로 취소하거나 인수하지 않는다. MyOTT 진행을 실제로 막는 플랫폼 장애만 긴급 의존성으로 승격한다.

본부는 MyOTT, 중앙 Monitor/Alert, 공용 운영정책과 Continuity·검수를 담당한다. NSC PM은 Commander·Windows Engine·내부 브라우저·프로세스 수복의 단일 source/execution owner다. TraderLab은 TL PM의 소스·실행권을 유지하며 계정·주문·AUTO_LIVE 권한을 공용 엔진 사용으로 승계하지 않는다. 같은 branch/worktree/공용 상태를 두 채팅이 동시에 수정하지 않는다.

## 2. 모든 장기작업의 운영

**한 번 패키징/핸드오프 → 백그라운드 자율 실행 → Monitor 관측 → failure/stall 감지 → 승인된 자동수복 → 안전 resume → 완료 또는 사람 판단이 필요한 HOLD일 때만 채팅 복귀.**

작업 패키징은 여러 단계의 실행명세를 묶는 것이며 배포 ZIP 생성과 구분한다. 채팅은 계획·범위·승인·인수·검수용이지 단계별 원격 셸이나 반복 polling 창이 아니다. 전체 명세를 실행 consumer에 전달하고 접수 및 노출을 확인한 뒤 짧게 보고하고 물러난다. 사용자 중간조회에는 기존 상태만 읽고 재실행하지 않는다.

명세에는 policyVersion, projectId, owner, originSessionId, packageId, manifestHash, sourceRevision, 승인 workspace, 단계·의존성·명령·검증, 산출물·해시, checkpoint, timeout/retry/repair 예산, 승인 gate와 표시정보를 포함한다. 실제 실행에는 runId/stepId/attempt/transactionId/jobId/Agent identity를 연결한다.

**지시 게시 ≠ 엔진 접수 ≠ 프로세스 시작 ≠ 단계 성공 ≠ 전체 완료.** 새 영수증이나 timestamp만으로 자율진행을 선언하지 않는다. 실제 consumer·repair executor가 없으면 BOOTSTRAP_REQUIRED/HOLD_PLATFORM이며, 미구현 기능을 채팅의 무한 작업 루프로 대신하지 않는다.

## 3. 자동수복·재개 기준

감지 → incident 기록 → 기존 프로세스·영수증·결과·중복 확인 → 원인분류 → 승인 repair recipe → 수복 검증 → 검증된 checkpoint에서 재개 → 후속 단계 → 산출물·terminal receipt → Monitor/Alert 순서를 사용한다.

Guardian과 worker 생명주기를 분리하며 수복 실행자는 평시 DORMANT다. 동일 장애·단계의 기본 재시도는 최대 3회로 두고 backoff 및 총 시간·시도 예산을 명세화한다. 정상적인 장시간 무출력 build를 ETA 초과만으로 중단하지 않는다.

연결만 끊겼고 worker가 살아 있으면 관측만 복구한다. 완료 후 표시만 누락되면 업무를 재실행하지 않는다. 프로세스 사망·Agent 재시작 뒤에는 journal/checkpoint/실행 신원을 조정한다. child 시작 후 결과기록 전 IN_DOUBT는 확인 전 replay하지 않는다. 저수준 NEVER_AUTO_RESUME를 전역 해제하지 않고 안전성이 확인된 단계만 상위 엔진에서 재개한다.

알려진 인자·경로·UTF-8·래퍼 오류와 사전 승인된 가역·무비용 수복은 범위 내 처리한다. 코드수복은 격리 작업트리에서 diff·테스트·롤백 증거를 남긴다. 미지원 오류·예산 소진은 HOLD_PM_REVIEW, 보안·권한·비용·파괴적·외부효과 판단은 HOLD_FOUNDER다. 인증·무결성·중복방지·승인 gate를 수복 명분으로 우회하지 않는다.

## 4. Monitor / Alert 표시 계약

기존 프로젝트 source writer → 정식 프로젝트 상태 → 중앙 집계 → Monitor/Local Alert 경로를 따른다. consumer가 읽는 durable package/state 없이 화면 JSON만 만들어 RUNNING을 연출하지 않는다.

**QUEUED/ACCEPTED 노출 → 실제 worker 시작·첫 heartbeat → RUNNING** 순서다. backend 데이터 readback과 실제 화면 확인은 별도 증거다.

| 상태 | 표시 내용 |
| --- | --- |
| 기본 | 제목 / 예상시작시간(참고용) / 간단요약 / 예상소요시간 |
| RUNNING | 실제 시작 / 경과시간 / 예상남은시간 / 최근 진행 |
| RECOVERING·RESUMING | 원인 / 수복 단계 / 횟수 / 재개 checkpoint |
| HOLD | 사유 / 필요한 판단 / 담당자 / 다음 조치 |
| 완료 | 실제 종료 / 결과물 / 검증 / terminal receipt |

계획시각은 실행 gate나 실제 시작시각이 아니다. 근거 없는 ETA는 미정으로 두고 음수·가짜 0을 표시하지 않는다. 원래 상태와 display 상태를 구분하며 REVIEW_REQUIRED/BLOCKED/PARTIAL을 성공·실행중으로 바꾸지 않는다. 집계 거부 시 미확인 프로젝트와 원인을 남긴다. activeCount=0만으로 모든 worker의 중단을 추론하지 않는다.

UTF-8 저장·전송·재읽기, 단일 writer, 원자 저장·버전/해시 대조, eventId 기반 중복알림 억제를 적용한다. 이미 손실된 문자는 원문 명세에서 복원해야 한다.

## 5. 현재 MyOTT 기준 및 다음 작업

이번 문서 변경의 제품 소스 기준은 `work/phase1-pre-rc-package-b-20260914`의 `0bd7ae25596a3a02da156056890073d90fad2674`다. 문서 갱신 전 로컬과 원격 일치·clean을 확인했다. 조회한 remote main은 `daca03c11c915b8759efd2b187e49abe8cd9a787`이며 제품 작업 브랜치·main·Production은 별개다.

제품 문서의 scope는 `PRE-PUBLIC-LAUNCH / STATELESS GLOBAL-FIRST PHASE 1`이다. 다음 작업은 현재 HEAD 기준 baseline, 승인된 제품 범위, 열린 결함, dependency/build, 실제 Preview/browser, Live TMDB 검증 필요 여부를 대조하고 가장 작은 실행 가능한 MyOTT 패키지를 정하는 것이다. 오래된 테스트/Founder QA를 현재 HEAD PASS로 승계하지 않는다.

현재-source build·Live provider·브라우저 provenance·RC identity·Security Seal·Release gate의 최신 증거를 먼저 확인한다. 이 문서 갱신에서는 제품 테스트·새 기능·Provider/Auth/DB 변경·Production 확인·배포를 수행하거나 승인하지 않았다. 기존 Phase 1 OFF 상태와 보호 gate는 유지한다.

## 6. 차선 점검과 완료 통보

ND엔진 자동수복 및 NSC 전용 브라우저의 기존 실행·검증 증거를 4시간 간격의 별도 읽기 점검으로 확인한다. 정상·동일 미해결 상태는 무알림, 새 장애·stall·관측 불능·중요한 수복/완료 변화만 짧게 보고한다. 이 관측은 로컬 Guardian·수복 executor를 대체하지 않는다.

과거 브라우저 후보 PASS, 현재 통합 후보 테스트, 설치된 live와 broker 호출 증거는 분리한다. 브라우저 비실행이 의도된 상태면 장애로 과장하지 않는다. 점검 때문에 사용자 브라우저/worker를 시작·재시작하거나 소스를 변경하지 않는다.

원 채팅 자동 완료 통보는 승인된 전송 경로, originSessionId/packageId/eventId/outbox/수신확인/중복억제를 검증한 뒤 사용한다. 아직 미검증이면 Monitor/Local Alert와 사용자의 결과 전달을 유지한다. 다음 작업은 사전 승인된 의존성과 완료 gate 안에서만 연결한다.

## 7. 안전·이력·적용

No Evidence, No PASS. 현재 Codex 사용은 금지한다. 오래된 문서의 Codex 역할·모드 언급은 실행 승인이 아니라 역사적 설계 참조다. reset/discard/force-push, 소유권 불명 변경 덮어쓰기, PID·포트만으로 프로세스 종료를 금지한다. main/master merge·Production·Release는 Founder gate를 유지한다. 장기·예약·상주는 창·포커스·대화형 UAC 없는 BACKGROUND_ONLY다.

이 최신 운영결정은 이전 문서의 충돌하는 역할·도구·작업방식에 우선하지만 제품 기능·보안 범위를 확대하지 않는다. 각 프로젝트의 적용 완료는 담당 PM의 policyVersion/policyHash/owner/acceptedAt ACK 및 실제 첫 패키지 준수 증거로 판정한다. 다른 채팅에 자동 주입되었다고 주장하지 않는다.

문서 전용 feature branch/PR의 게시와 main 병합을 구분한다. 이번 문서 작업은 제품 소스나 live를 바꾸지 않는다. 기존 역사 문서·실패 증거를 보존하며, 날짜가 오래된 대시보드의 상태는 새 실행 증거 없이 현재 사실로 승계하지 않는다.
