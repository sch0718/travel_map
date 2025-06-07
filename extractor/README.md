# 네이버 지도 URL 정보 추출기

이 프로젝트는 네이버 지도 단축 URL에서 장소 정보(위경도, 주소, 상호명 등)를 추출하여 JSON 파일에 추가하는 스크립트를 제공합니다.

## 기능

- 네이버 지도 단축 URL에서 장소 ID 추출
- 장소 ID를 이용하여 네이버 지도 API에서 상세 정보 조회
- 추출한 정보를 JSON 파일에 추가
- 중복 URL 확인 및 건너뛰기
- 처리한 URL을 별도 파일로 이동하여 관리

## 사용 방법

1. `extractor/target_urls.txt` 파일에 네이버 지도 단축 URL 목록을 한 줄에 하나씩 작성합니다.
2. `data/maps/jeju_food.json` 파일이 있는지 확인합니다. 이 파일에 추출한 정보가 추가됩니다.
3. 다음 명령어로 스크립트를 실행합니다:

```bash
python extractor/extract_naver_places.py
```

## 필요 패키지

스크립트 실행을 위해 다음 Python 패키지가 필요합니다:

```bash
pip install requests uuid
```

## 파일 구조

- `extractor/extract_naver_places.py`: 장소 정보 추출 스크립트
- `extractor/target_urls.txt`: 처리할 네이버 지도 단축 URL 목록
- `extractor/finished_urls.txt`: 처리 완료된 URL 목록
- `data/maps/jeju_food.json`: 추출한 정보가 저장될 JSON 파일

## 스크립트 동작 방식

1. 네이버 지도 단축 URL(https://naver.me/xxxx)에서 장소 ID를 추출합니다.
2. 장소 ID를 사용하여 네이버 지도 API(`https://map.naver.com/p/api/place/summary/{place_id}`)에서 상세 정보를 조회합니다.
3. 상세 정보에서 필요한 데이터(제목, 위치, 주소, 설명 등)를 추출합니다.
4. 추출한 정보를 JSON 파일의 `places` 배열에 추가합니다.
5. 처리가 완료된 URL은 `target_urls.txt`에서 제거하고 `finished_urls.txt`에 추가합니다.
6. 모든 URL 처리가 완료되면 수정된 JSON 파일을 저장합니다.

## 예시 출력

추출된 장소 정보는 다음과 같은 형식으로 JSON 파일에 추가됩니다:

```json
{
    "id": "place-0e539f388391",
    "title": "해녀의부엌 북촌점",
    "location": {
        "lat": 33.5499008,
        "lng": 126.69344
    },
    "address": "제주 제주시 조천읍 북촌9길 31",
    "description": "의미 있는 추억을 부르는 맛있는 음식",
    "urls": {
        "naver": "https://naver.me/5jJTNF2x"
    },
    "labels": [
        "향토음식"
    ]
}
```

## 주의사항

- 네이버 지도 API는 짧은 시간 내에 많은 요청을 보내면 일시적으로 차단될 수 있습니다. 스크립트는 요청 간에 1초의 지연을 두어 이를 방지합니다.
- 일부 URL에서는 정보를 추출하지 못할 수 있습니다. 이 경우 해당 URL은 건너뛰고 다음 URL로 진행됩니다. 