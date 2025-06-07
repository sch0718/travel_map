# 데이터 스키마 정의

이 디렉토리에는 여행 지도 애플리케이션에서 사용하는 데이터 구조의 JSON 스키마 정의가 포함되어 있습니다. 이 스키마를 통해 데이터 구조의 일관성을 유지하고 유효성을 검증할 수 있습니다.

## 스키마 파일 목록

- `labels.schema.json`: 라벨 데이터 구조 정의
- `map-common.schema.json`: 모든 지도 유형에서 공통으로 사용하는 데이터 구조 정의
- `theme-map.schema.json`: 테마 지도 데이터 구조 정의
- `trip-map.schema.json`: 여행 지도 데이터 구조 정의

## 스키마 사용 방법

### 1. 데이터 유효성 검증

새 데이터 파일을 생성하거나 기존 데이터를 수정할 때 JSON 스키마 검증 도구를 사용하여 데이터의 유효성을 검증할 수 있습니다.

```bash
# npm을 통한 ajv 설치 (JSON Schema 검증 도구)
npm install -g ajv-cli

# 스키마를 사용하여 데이터 검증
ajv validate -s data/schemas/theme-map.schema.json -d data/maps/theme_theme1.json

# 또는
ajv validate -s data/schemas/trip-map.schema.json -d data/maps/trip_trip1.json
```

### 2. IDE 통합

VSCode나 WebStorm과 같은 IDE는 JSON 스키마를 통합하여 실시간 유효성 검사와 자동 완성 기능을 제공합니다.

VSCode에서는 `settings.json` 파일에 다음 설정을 추가하여 스키마를 연결할 수 있습니다:

```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/data/system/labels.json"],
      "url": "./data/schemas/labels.schema.json"
    },
    {
      "fileMatch": ["**/data/maps/theme_*.json"],
      "url": "./data/schemas/theme-map.schema.json"
    },
    {
      "fileMatch": ["**/data/maps/trip_*.json"],
      "url": "./data/schemas/trip-map.schema.json"
    }
  ]
}
```

### 3. 프로그래밍 방식 검증

애플리케이션 코드에서 데이터를 검증하려면 다음과 같이 할 수 있습니다:

```javascript
// Node.js 환경에서 Ajv를 사용한 검증 예시
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });
const fs = require('fs');

// 스키마 로드
const themeMapSchema = JSON.parse(fs.readFileSync('./data/schemas/theme-map.schema.json'));
const commonSchema = JSON.parse(fs.readFileSync('./data/schemas/map-common.schema.json'));

// 스키마 등록 (참조 해결을 위해)
ajv.addSchema(commonSchema);
const validate = ajv.compile(themeMapSchema);

// 데이터 검증
const themeMapData = JSON.parse(fs.readFileSync('./data/maps/theme_theme1.json'));
const valid = validate(themeMapData);

if (!valid) {
  console.log('유효성 검사 오류:', validate.errors);
} else {
  console.log('데이터가 유효합니다!');
}
```

## 스키마 확장

데이터 구조가 변경되면 해당 스키마 파일을 업데이트해야 합니다. 스키마를 확장하거나 수정할 때는 다음 사항을 고려하세요:

1. 기존 데이터와의 호환성 유지
2. 필수 필드와 선택적 필드의 구분
3. 데이터 형식 및 제약 조건 명확히 정의
4. 스키마 버전 관리 고려

## 라벨 데이터 구조 변경사항

최근 데이터 구조 변경:

1. 시스템 라벨 및 지도 라벨에서 `id` 필드 제거
2. 지도 데이터에서 `user_labels` → `labels`로 변경
3. 장소 데이터에서 라벨 참조 방식을 ID에서 이름으로 변경

이러한 변경으로 사용자는 각 지도마다 같은 라벨이라도 색상, 아이콘 등을 자유롭게 재정의할 수 있게 되었습니다. 