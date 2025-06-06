#!/bin/bash

# 여행 지도 웹앱 로컬 서버 실행 스크립트

echo "여행 지도 웹앱 서버를 시작합니다..."
echo "웹 브라우저에서 http://localhost:3000 으로 접속하세요."
echo "서버를 중지하려면 Ctrl+C를 누르세요."
echo ""

# Python 설치 여부 확인
if command -v python3 &>/dev/null; then
    echo "Python 3를 사용하여 서버를 시작합니다."
    python3 -m http.server 3000
elif command -v python &>/dev/null; then
    # Python 버전 확인
    PYTHON_VERSION=$(python -c 'import sys; print(sys.version_info[0])')
    if [ "$PYTHON_VERSION" -eq 3 ]; then
        echo "Python 3를 사용하여 서버를 시작합니다."
        python -m http.server 3000
    else
        echo "Python 2를 사용하여 서버를 시작합니다."
        python -m SimpleHTTPServer 3000
    fi
elif command -v npx &>/dev/null; then
    echo "Node.js를 사용하여 서버를 시작합니다."
    npx http-server -p 3000
else
    echo "오류: 서버를 시작하기 위한 Python 또는 Node.js가 설치되어 있지 않습니다."
    echo "다음 중 하나를 설치해주세요:"
    echo "  - Python 3: https://www.python.org/downloads/"
    echo "  - Node.js: https://nodejs.org/"
    exit 1
fi 