# 여행 지도 웹앱

여행 지도 웹앱은 지도 기반으로 테마별 장소 및 여행 일정을 시각화하는 웹 애플리케이션입니다.

## 주요 기능

- **테마별 장소 보기**: 다양한 테마(관광지, 맛집, 교통/숙박 등)에 따라 장소를 필터링하여 볼 수 있습니다.
- **여행 일정 보기**: 일자별 여행 계획을 지도상에서 확인할 수 있습니다.
- **장소 검색**: 장소명, 주소, 설명, 태그 등으로 장소를 검색할 수 있습니다.
- **카테고리 필터링**: 테마 내에서 세부 카테고리별로 장소를 필터링할 수 있습니다.
- **장소 상세 정보**: 각 장소의 상세 정보, 주소, 설명, 태그를 확인할 수 있습니다.
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 등 다양한 화면 크기에 최적화되어 있습니다.

## 설치 및 실행 방법

1. **저장소 클론**
   ```
   git clone [저장소 URL]
   cd travel_map
   ```

2. **카카오맵 API 키 설정**
   - [카카오 개발자 센터](https://developers.kakao.com)에서 애플리케이션을 등록하고 JavaScript 키를 발급받습니다.
   - `index.html` 파일에서 다음 부분을 찾아 발급받은 API 키로 변경합니다:
     ```html
     <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=KAKAO_APP_KEY"></script>
     ```

3. **웹 서버 실행**
   - 제공된 스크립트를 사용하여 간단히 로컬 서버를 실행할 수 있습니다:
     ```
     sh start_server.sh
     ```
   - 또는 다음 방법 중 하나를 선택할 수 있습니다:
     ```
     # Python 3를 사용하는 경우
     python3 -m http.server 3000
     
     # Node.js를 사용하는 경우
     npx http-server -p 3000
     ```
   - 웹 브라우저에서 http://localhost:3000 으로 접속하여 앱을 확인합니다.

## 프로젝트 구조

```
travel_map/
├── index.html            # 메인 HTML 파일
├── css/                  # CSS 스타일시트
│   ├── style.css         # 기본 스타일
│   └── responsive.css    # 반응형 스타일
├── js/                   # JavaScript 파일
│   ├── data.js           # 데이터 관리 모듈
│   ├── map.js            # 지도 관리 모듈
│   └── ui.js             # UI 관리 모듈
├── data/                 # 데이터 파일
│   ├── maps/             # 지도 데이터 파일
│   │   ├── theme_*.json  # 테마 지도 데이터
│   │   └── trip_*.json   # 여행 일정 데이터
│   ├── schemas/          # JSON 스키마 정의
│   │   ├── labels.schema.json       # 라벨 데이터 스키마
│   │   ├── map-common.schema.json   # 공통 지도 스키마
│   │   ├── theme-map.schema.json    # 테마 지도 스키마
│   │   └── trip-map.schema.json     # 여행 일정 스키마
│   └── system/           # 시스템 데이터
│       ├── labels.json             # 라벨 정의
│       └── transportations.json    # 이동 수단 정의
└── docs/                 # 문서 파일
    ├── 작업_계획서.md     # 작업 계획 문서
    ├── 화면설계서.md      # UI/UX 화면 설계 문서
    └── 요구사항 정의서.md  # 요구사항 정의 문서
```

## 데이터 구조 및 유효성 검사

이 프로젝트는 JSON Schema를 사용하여 데이터 구조의 유효성을 검사합니다. 다음 명령으로 데이터 파일의 유효성을 검사할 수 있습니다:

```
# 테마 지도 데이터 검증
npm run validate:theme

# 여행 지도 데이터 검증
npm run validate:trip

# 라벨 데이터 검증
npm run validate:labels

# 모든 데이터 검증
npm run validate:all
```

## 기술 스택

- HTML5
- CSS3 (반응형 디자인)
- JavaScript (ES6+)
- 카카오맵 API
- AJV (JSON Schema 검증)
- Iconify (아이콘 라이브러리)

## 향후 개발 계획

- 사용자 인증 및 개인화 기능
- 사용자별 커스텀 테마 및 여행 일정 생성
- 장소 리뷰 및 평점 기능
- 오프라인 지원 (PWA)
- 소셜 미디어 공유 기능 