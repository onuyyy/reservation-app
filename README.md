# 예약 관리 앱

FastAPI 기반 예약 관리 앱입니다. Docker로 실행하며, 기본 접속 주소는 `http://localhost:8000`입니다.

## 현재 업무 요구사항

이 앱은 영업 후 행사 예약을 관리하고, 행사 전 준비 자료와 행사 후 정산 자료를 한 흐름으로 처리하기 위한 내부 업무 도구입니다.

기본 업무 흐름은 아래와 같습니다.

1. 거래처와 예약 이야기가 오가면 먼저 `가예약 캘린더`에 일정을 기록합니다.
2. 가예약 단계에서는 확정 전 정보도 빠르게 적을 수 있습니다.
3. 행사 전날에는 캘린더 일정 중 `행사표 포함`으로 표시한 항목을 `행사표`에서 조회합니다.
4. 행사표에서 예상 인원, 전화, 담당자, 식사, 차량, 비고를 정리하고 엑셀로 출력합니다.
5. 행사가 끝난 후 행사표 항목을 `정산등록`으로 넘겨 `정산 내역`에 실제 정산 정보를 저장합니다.
6. 정산 내역은 확정된 행사 후 금액, 입금, 수수료, 계좌 정보, 비고를 관리하는 기준 자료입니다.

## 주요 기능

### 가예약 캘린더

- 월별 캘린더에 가예약 일정을 표시합니다.
- 일정 카드는 `행사장 - 고객 인원명` 순서로 표시됩니다.
- 일정은 `가예약` 또는 `행사표` 상태로 구분됩니다.
- 일정 입력 항목:
  - 날짜
  - 행사장
  - 단체명
  - 예상 인원
  - 전화
  - 담당자
  - 식사
  - 차량
  - 메모
  - 행사표 포함 여부
- 단체명 입력 시 고객 관리에 등록된 고객이면 전화번호와 담당자를 자동으로 불러옵니다.
- 자동으로 불러온 전화번호와 담당자는 수동 수정할 수 있습니다.
- 기존 고객의 전화번호와 담당자는 기본값으로만 불러오며, 가예약에서 수정한 값은 해당 일정에만 저장됩니다.
- 새 고객/행사장이 입력되면 등록 여부를 묻습니다.
  - `등록하고 저장`: 고객/행사장 관리에 등록하고 가예약도 저장합니다.
  - `일정만 저장`: 고객/행사장 관리에는 등록하지 않고 가예약만 저장합니다.

### 행사표

- 특정 날짜의 `행사표 포함` 일정만 조회합니다.
- 행사표에서 예상 인원, 전화, 담당자, 식사, 차량, 메모를 바로 수정할 수 있습니다.
- 행사표를 엑셀 파일로 출력할 수 있습니다.
- 행사표 항목을 `정산등록` 버튼으로 정산 모달에 넘길 수 있습니다.
- 정산등록 시 날짜, 단체명, 행사장, 인원, 전화, 담당자, 메모가 자동 입력됩니다.

### 정산 내역

- 행사 후 실제 정산 자료를 저장합니다.
- 정산 입력 항목:
  - 행사일
  - 단체명
  - 행사명
  - 업체
  - 판매가
  - DC후 판매가
  - 인원
  - DC금액
  - 입금액
  - 실판매가
  - 전화번호
  - 은행
  - 계좌번호
  - 예금주
  - 담당자
  - 비고
- 단체명 선택 시 고객 관리의 전화번호와 담당자를 불러오며 수동 수정할 수 있습니다.
- 은행, 계좌번호, 예금주는 정산마다 다를 수 있으므로 정산내역에만 입력하고 저장합니다.
- 정산 저장 시 신규 고객/행사장이 있으면 등록 여부를 묻고, 확인하면 마스터에 자동 등록합니다.
- 연도, 월, 업체, 키워드로 필터링할 수 있습니다.
- 행사일별 탭, 합계, 요약 카드, 엑셀 다운로드를 제공합니다.

### 고객/행사장 관리

- 고객 관리:
  - 단체명, 구분, 전화번호, 담당자, 메모를 관리합니다.
- 행사장 관리:
  - 행사장명과 메모를 관리합니다.
- 고객명과 행사장명은 중복 등록을 막습니다.
- 정산에서 사용 중인 고객/행사장은 삭제가 제한됩니다.

### 통계

- 연도 기준 월별 매출/인원 통계를 표시합니다.
- 업체별 매출/건수/인원 통계를 표시합니다.

## 아키텍처

```text
Browser
  |
  | HTML/CSS/JS
  v
FastAPI app (main.py)
  |
  +-- routers/reservations.py     /api/reservations
  +-- routers/calendar_events.py  /api/calendar
  +-- routers/event_sheet.py      /api/event-sheet
  +-- routers/clients.py          /api/clients
  +-- routers/venues.py           /api/venues
  |
  v
SQLite database (data/yy.db)
```

### 주요 파일

- `main.py`: FastAPI 앱 생성, 라우터 등록, 정적 파일 제공
- `database.py`: SQLAlchemy 엔진, 세션, ORM 모델 정의
- `schemas.py`: 정산 내역 Pydantic 스키마
- `routers/calendar_events.py`: 가예약 캘린더 CRUD API
- `routers/event_sheet.py`: 행사표 엑셀 출력 API
- `routers/reservations.py`: 정산 CRUD, 통계, 엑셀 출력 API
- `routers/clients.py`: 고객 관리 API
- `routers/venues.py`: 행사장 관리 API
- `templates/index.html`: 단일 화면 UI
- `static/js/app.js`: 화면 전환, 캘린더, 행사표, 정산, 관리 화면 로직
- `static/css/style.css`: UI 스타일
- `data/yy.db`: SQLite 데이터 파일

## 엔티티 연관관계

현재 DB의 핵심 엔티티는 `clients`, `venues`, `calendar_events`, `reservations`입니다.

```text
clients
  id PK
  name UNIQUE
  phone
  manager
  memo

venues
  id PK
  name UNIQUE
  memo

calendar_events
  id PK
  event_date
  client   -- clients.name을 문자열로 저장
  venue    -- venues.name을 문자열로 저장
  phone
  manager
  headcount
  is_confirmed
  meal
  vehicle
  note

reservations
  id PK
  calendar_event_id FK -> calendar_events.id
  event_date
  group_name
  event_name
  client_id FK -> clients.id
  venue_id  FK -> venues.id
  phone
  manager
  bank
  account_number
  account_holder
  deposit
  actual_sale
  memo
```

관계도:

```text
clients                          reservations                         venues
-------                          ------------                         ------
id PK  <----------------------   client_id FK              FK venue_id ----> id PK
name                             group_name                              name
phone                            event_name                              memo
manager                          bank
memo                             account_number
                                 account_holder
                                 memo

   ^                                  ^
   | 이름 기준 기본값 조회             | 정산등록 시 calendar_event_id로 연결
   |                                  |
calendar_events ----------------------+
---------------
id PK
client  (clients.name 문자열)
venue   (venues.name 문자열)
phone   (행사별 스냅샷)
manager (행사별 스냅샷)
headcount
is_confirmed
```

### 관계 정책

- `clients`는 고객의 기본 연락 정보 마스터입니다.
- `venues`는 행사장 마스터입니다.
- `calendar_events`는 가예약/행사표용 일정입니다.
- `calendar_events.client`, `calendar_events.venue`는 FK가 아니라 이름 문자열입니다.
- 가예약에서 단체명을 선택하면 `clients.name` 기준으로 고객의 전화번호/담당자를 기본값으로 가져옵니다.
- 가예약 또는 행사표에서 수정한 전화번호/담당자는 해당 행사 일정의 스냅샷으로만 저장됩니다.
- 행사표에서 정산등록을 하면 `reservations.calendar_event_id`로 원본 행사표 일정과 연결합니다.
- 같은 행사표 일정으로 이미 정산내역이 있으면 새로 만들지 않고 기존 정산내역 수정으로 유도합니다.
- 정산내역 `reservations`는 `client_id`, `venue_id`, `calendar_event_id`를 저장할 수 있고, 동시에 행사 당시 정산값을 스냅샷 필드로 보관합니다.
- 은행, 계좌번호, 예금주는 고객 마스터가 아니라 정산내역의 행사별 정보로 관리합니다.

## 데이터 모델 상세

### clients

고객 마스터입니다.

- `name`: 단체명
- `type`: 구분
- `phone`: 전화번호
- `manager`: 담당자
- `memo`: 메모

참고: 기존 호환을 위해 DB에는 `bank`, `account_number`, `account_holder` 컬럼이 남아 있을 수 있지만, 현재 고객관리 화면에서는 사용하지 않습니다. 계좌 정보는 정산내역에서 행사별로 관리합니다.

### venues

행사장 마스터입니다.

- `name`: 행사장명
- `memo`: 메모

### calendar_events

가예약 캘린더와 행사표의 기준 데이터입니다.

- `event_date`: 행사일
- `venue`: 행사장명
- `client`: 단체명
- `headcount`: 예상 인원
- `note`: 메모
- `is_confirmed`: 행사표 포함 여부
- `phone`: 전화번호
- `manager`: 담당자
- `meal`: 식사
- `vehicle`: 차량

### reservations

행사 후 정산 기준 데이터입니다.

- `event_date`: 행사일
- `group_name`: 단체명
- `event_name`: 행사명 또는 행사장
- `vendor`: 업체
- `sale_price`: 판매가
- `dc_sale_price`: DC후 판매가
- `headcount`: 인원
- `dc_amount`: DC금액
- `deposit`: 입금액
- `actual_sale`: 실판매가
- `phone`: 전화번호
- `bank`: 은행
- `account_number`: 계좌번호
- `account_holder`: 예금주
- `manager`: 담당자
- `memo`: 비고
- `venue_id`: 행사장 ID
- `client_id`: 고객 ID
- `calendar_event_id`: 원본 행사표 일정 ID

## 데이터 연결 방식

- 정산 내역은 `client_id`, `venue_id`를 저장할 수 있습니다.
- 가예약 캘린더는 현재 고객/행사장 ID가 아니라 `client`, `venue` 이름 문자열을 저장합니다.
- 따라서 가예약과 고객 관리는 이름 기준으로 동기화합니다.
- 가예약에서 기존 고객명을 선택하면 고객 관리의 전화번호/담당자를 기본값으로 가져옵니다.
- 가예약 또는 행사표에서 전화번호/담당자를 수정해도 고객 관리 정보는 바뀌지 않습니다.
- 가예약에서 새로운 고객명/행사장명을 입력하면 등록 여부를 묻습니다.
- 등록하지 않고 일정만 저장한 경우 해당 이름은 캘린더에는 남지만 고객/행사장 마스터에는 생기지 않습니다.

## 제약사항

- 인증/권한 기능은 없습니다. 접속 가능한 사용자는 모든 데이터를 조회/수정할 수 있습니다.
- SQLite 단일 파일 DB를 사용합니다. 여러 명이 동시에 많이 수정하는 환경에는 적합하지 않습니다.
- 정식 마이그레이션 도구는 없습니다. `Base.metadata.create_all()`과 일부 수동 컬럼 보강 로직을 사용합니다.
- 가예약 캘린더는 고객/행사장 ID 기반 FK 연결이 아니라 이름 기반 연결입니다.
- 고객명 또는 행사장명을 변경하면 기존 가예약 문자열이 자동으로 일괄 변경되지는 않습니다.
- 행사표는 `is_confirmed` 값이 참인 캘린더 일정만 조회합니다.
- 엑셀 출력은 서버에서 `openpyxl`로 생성합니다.
- 데이터 백업은 `data/yy.db` 파일 복사 방식입니다.
- 현재 프론트엔드는 빌드 도구 없이 `templates/index.html`, `static/js/app.js`, `static/css/style.css`로 구성된 단일 페이지 방식입니다.

## API 개요

- `GET /`: 메인 화면
- `GET /docs`: FastAPI Swagger 문서
- `/api/calendar`: 가예약 캘린더 CRUD
- `/api/calendar/confirmed`: 특정 날짜 행사표 포함 일정 조회
- `/api/event-sheet/export/excel`: 행사표 엑셀 다운로드
- `/api/reservations`: 정산 내역 CRUD
- `/api/reservations/export/excel`: 정산 내역 엑셀 다운로드
- `/api/reservations/stats/monthly`: 월별 통계
- `/api/reservations/stats/vendor`: 업체별 통계
- `/api/clients`: 고객 관리 CRUD
- `/api/venues`: 행사장 관리 CRUD

## 포함된 데이터

예약 데이터베이스는 프로젝트의 `data/yy.db` 파일에 들어 있습니다.

Docker 실행 시 아래 설정으로 로컬 `data` 폴더가 컨테이너 안 `/app/data`에 연결됩니다.

```yaml
volumes:
  - ./data:/app/data
```

따라서 다른 컴퓨터에서 실행할 때도 `data/yy.db` 파일이 같이 있으면 같은 데이터로 시작합니다.

## Windows 실행 방법

### 1. 필수 프로그램 설치

아래 프로그램을 설치합니다.

- Git for Windows: https://git-scm.com/download/win
- Docker Desktop: https://www.docker.com/products/docker-desktop/

설치 후 Docker Desktop을 실행하고 초기 설정이 끝날 때까지 기다립니다.

PowerShell에서 설치 확인:

```powershell
git --version
docker --version
docker compose version
```

### 2. 프로젝트 다운로드

PowerShell에서 원하는 위치로 이동한 뒤 실행합니다.

```powershell
cd Desktop
git clone https://github.com/onuyyy/reservation-app.git
cd reservation-app
```

Git을 설치하지 못하는 환경이면 GitHub 페이지에서 `Code -> Download ZIP`으로 받은 뒤 압축을 풀고, PowerShell에서 압축 해제한 폴더로 이동해도 됩니다.

### 3. 앱 실행

```powershell
docker compose up -d --build
```

브라우저에서 접속:

```text
http://localhost:8000
```

## macOS 실행 방법

### 1. 필수 프로그램 설치

아래 프로그램을 설치합니다.

- Git: macOS 기본 개발자 도구 또는 https://git-scm.com/download/mac
- Docker Desktop: https://www.docker.com/products/docker-desktop/

Docker Desktop을 실행하고 초기 설정이 끝날 때까지 기다립니다.

터미널에서 설치 확인:

```bash
git --version
docker --version
docker compose version
```

`git` 명령어 실행 시 개발자 도구 설치 안내가 나오면 안내에 따라 설치한 뒤 다시 실행합니다.

### 2. 프로젝트 다운로드

터미널에서 원하는 위치로 이동한 뒤 실행합니다.

```bash
cd ~/Desktop
git clone https://github.com/onuyyy/reservation-app.git
cd reservation-app
```

Git을 설치하지 못하는 환경이면 GitHub 페이지에서 `Code -> Download ZIP`으로 받은 뒤 압축을 풀고, 터미널에서 압축 해제한 폴더로 이동해도 됩니다.

### 3. 앱 실행

```bash
docker compose up -d --build
```

브라우저에서 접속:

```text
http://localhost:8000
```

## 자주 쓰는 명령어

실행 중인 컨테이너 확인:

```bash
docker ps
```

로그 보기:

```bash
docker logs yy-reservation
```

앱 중지:

```bash
docker compose down
```

다시 실행:

```bash
docker compose up -d
```

소스코드 변경 후 재빌드:

```bash
docker compose up -d --build
```

## 컴퓨터 켤 때 자동 실행

Docker Desktop 설정에서 자동 실행을 켤 수 있습니다.

```text
Settings -> General -> Start Docker Desktop when you sign in to your computer
```

이 프로젝트는 `restart: unless-stopped`가 설정되어 있어, Docker Desktop이 다시 켜지면 기존 컨테이너가 자동으로 다시 실행됩니다.

단, 직접 아래 명령어로 끈 경우에는 자동으로 다시 올라오지 않을 수 있습니다.

```bash
docker compose down
```

그때는 프로젝트 폴더에서 다시 실행합니다.

```bash
docker compose up -d
```

## 데이터 백업

중요 데이터는 `data/yy.db` 파일입니다. 백업이 필요하면 이 파일을 별도로 복사해두면 됩니다.

다른 컴퓨터로 옮길 때는 프로젝트 폴더 전체를 옮기거나, 최소한 `data/yy.db`가 포함되어 있어야 합니다.
