# 네이버 지도 URL 정보 추출기

이 프로젝트는 네이버 지도 단축 URL에서 장소 정보(위경도, 주소, 상호명 등)를 추출하여 JSON 파일에 추가하는 스크립트를 제공합니다.

## 기능

- 네이버 지도 단축 URL에서 장소 ID 추출
- 장소 ID를 이용하여 네이버 지도 API에서 상세 정보 조회
- 추출한 정보를 JSON 파일에 추가
- 중복 URL 확인 및 건너뛰기
- 처리한 URL을 별도 파일로 이동하여 관리
- 특정 지역/테마에 맞는 라벨 자동 추가

## 사용 방법

### 기본 사용법

1. `extractor/target_urls.txt` 파일에 네이버 지도 단축 URL 목록을 한 줄에 하나씩 작성합니다.
2. 원하는 지역의 JSON 파일이 `data/maps/` 디렉토리에 있는지 확인하거나 새로 생성합니다.
3. `extract_naver_places.py` 스크립트의 `json_file` 변수를 원하는 대상 파일로 수정합니다.
4. 다음 명령어로 스크립트를 실행합니다:

```bash
python extractor/extract_naver_places.py
```

### 강남역 맛집 데이터 추출

강남역 주변 맛집 정보를 추출하려면:

1. `extractor/target_urls.txt` 파일에 네이버 지도 단축 URL 목록을 추가합니다.
2. `extract_naver_places.py` 파일에서 다음 라인을 확인하고 필요시 수정합니다:
   ```python
   json_file = "data/maps/gangnam_food.json"
   ```
3. 스크립트 실행:
   ```bash
   python extractor/extract_naver_places.py
   ```

### 다른 지역 데이터 추출

새로운 지역의 데이터를 추출하려면:

1. 먼저 해당 지역에 대한 JSON 파일을 생성합니다:
   ```json
   {
       "id": "지역명_카테고리-YYYY.MM.DD",
       "title": "지역명 카테고리",
       "description": "지역명 카테고리 목록",
       "created": "YYYY-MM-DD",
       "modified": "YYYY-MM-DD",
       "color": "#색상코드",
       "labels": ["지역명", "카테고리"],
       "places": []
   }
   ```

2. `extract_naver_places.py` 파일에서 다음을 수정합니다:
   - `json_file` 변수를 새 파일 경로로 변경
   - `create_place_object()` 함수에서 라벨 추가 부분을 해당 지역에 맞게 수정:
   ```python
   # 지역에 맞는 라벨 추가
   labels.extend(["지역명", "카테고리"])
   ```

3. URL을 `target_urls.txt`에 추가하고 스크립트를 실행합니다.

## 필요 패키지

스크립트 실행을 위해 다음 Python 패키지가 필요합니다:

```bash
pip install requests uuid
```

## 파일 구조

- `extractor/extract_naver_places.py`: 장소 정보 추출 스크립트
- `extractor/target_urls.txt`: 처리할 네이버 지도 단축 URL 목록
- `extractor/finished_urls.txt`: 처리 완료된 URL 목록
- `data/maps/`: 추출한 정보가 저장될 JSON 파일들이 있는 디렉토리
  - `jeju_food.json`: 제주도 맛집 정보
  - `gangnam_food.json`: 강남역 맛집 정보
  - 기타 지역별 정보 파일

## 스크립트 동작 방식

1. 네이버 지도 단축 URL(https://naver.me/xxxx)에서 장소 ID를 추출합니다.
2. 장소 ID를 사용하여 네이버 지도 API(`https://map.naver.com/p/api/place/summary/{place_id}`)에서 상세 정보를 조회합니다.
3. 상세 정보에서 필요한 데이터(제목, 위치, 주소, 설명 등)를 추출합니다.
4. 장소의 카테고리와 지역에 맞는 라벨을 자동으로 추가합니다.
5. 추출한 정보를 JSON 파일의 `places` 배열에 추가합니다.
6. 처리가 완료된 URL은 `target_urls.txt`에서 제거하고 `finished_urls.txt`에 추가합니다.
7. 모든 URL 처리가 완료되면 수정된 JSON 파일을 저장합니다.

## 예시 출력

추출된 장소 정보는 다음과 같은 형식으로 JSON 파일에 추가됩니다:

```json
{
    "id": "place-4fa35d1b5339",
    "title": "연희동칼국수 강남역점",
    "location": {
        "lat": 37.4978933,
        "lng": 127.0259573
    },
    "address": "서울 서초구 서초대로 411 B1-3호",
    "description": "깊은 사골 국물 맛의 맛있는 칼국수",
    "urls": {
        "naver": "https://naver.me/5YFdbzZa"
    },
    "labels": [
        "서울",
        "강남역",
        "맛집",
        "칼국수,만두"
    ]
}
```

## 주의사항

- 네이버 지도 API는 짧은 시간 내에 많은 요청을 보내면 일시적으로 차단될 수 있습니다. 스크립트는 요청 간에 1초의 지연을 두어 이를 방지합니다.
- 일부 URL에서는 정보를 추출하지 못할 수 있습니다. 이 경우 해당 URL은 건너뛰고 다음 URL로 진행됩니다.
- 여러 지역의 데이터를 추출할 때는 각 지역에 맞게 스크립트의 `json_file` 변수와 라벨 설정을 수정해야 합니다. 