# 예약 관리 앱

FastAPI 기반 예약 관리 앱입니다. Docker로 실행하며, 기본 접속 주소는 `http://localhost:8000`입니다.

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
