#!/usr/bin/env python3
import json
import uuid
import os
import requests
import re
import time
from urllib.parse import urlparse, parse_qs

def get_place_id_from_url(short_url):
    """네이버 지도 단축 URL에서 장소 ID를 추출합니다."""
    try:
        response = requests.get(short_url, allow_redirects=True)
        final_url = response.url
        
        # URL에서 place ID 추출
        if '/place/' in final_url:
            match = re.search(r'/place/(\d+)', final_url)
            if match:
                return match.group(1)
        return None
    except Exception as e:
        print(f"Error getting place ID from {short_url}: {e}")
        return None

def get_place_info(place_id):
    """장소 ID로부터 상세 정보를 가져옵니다."""
    try:
        url = f"https://map.naver.com/p/api/place/summary/{place_id}"
        headers = {
            "Referer": "https://map.naver.com/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"
        }
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error getting place info for ID {place_id}: HTTP {response.status_code}")
            return None
    except Exception as e:
        print(f"Error getting place info for ID {place_id}: {e}")
        return None

def create_place_object(place_info, url):
    """API 응답에서 필요한 정보를 추출하여 장소 객체를 생성합니다."""
    if not place_info:
        return None
    
    try:
        return {
            "id": f"place-{uuid.uuid4().hex[:12]}",
            "title": place_info.get("name", ""),
            "location": {
                "lat": float(place_info.get("y", 0)),
                "lng": float(place_info.get("x", 0))
            },
            "address": place_info.get("roadAddress", ""),
            "description": place_info.get("microReview", "") or "",
            "urls": {
                "naver": url
            },
            "labels": [place_info.get("category", "")] if place_info.get("category") else []
        }
    except Exception as e:
        print(f"Error creating place object: {e}")
        return None

def move_url_to_finished(url, target_file, finished_file):
    """처리한 URL을 finished_urls.txt 파일로 이동합니다."""
    try:
        # 대상 URL 파일에서 해당 URL 제거
        with open(target_file, 'r') as f:
            urls = [line.strip() for line in f if line.strip()]
        
        urls.remove(url)
        
        with open(target_file, 'w') as f:
            for remaining_url in urls:
                f.write(f"{remaining_url}\n")
        
        # finished_urls.txt 파일에 URL 추가
        with open(finished_file, 'a+') as f:
            f.write(f"{url}\n")
            
        print(f"Moved {url} to {finished_file}")
        return True
    except Exception as e:
        print(f"Error moving URL to finished file: {e}")
        return False

def main():
    # 파일 경로 설정
    target_file = "extractor/target_urls.txt"
    finished_file = "extractor/finished_urls.txt"
    json_file = "data/maps/jeju_food.json"
    
    # finished_urls.txt 파일이 없으면 생성
    if not os.path.exists(finished_file):
        with open(finished_file, 'w') as f:
            pass
    
    # URL 목록 읽기
    with open(target_file, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]
    
    # JSON 파일 읽기
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 추가된 장소 수 카운팅
    added_count = 0
    
    # 각 URL에 대해 정보 추출 및 JSON에 추가
    for url in urls[:]:  # 복사본으로 반복하여 안전하게 항목 제거
        print(f"Processing {url}...")
        
        # 이미 추가된 URL인지 확인
        existing = any(place.get("urls", {}).get("naver") == url for place in data["places"])
        if existing:
            print(f"URL {url} already exists in the JSON file. Moving to finished...")
            move_url_to_finished(url, target_file, finished_file)
            continue
        
        # 장소 ID 추출
        place_id = get_place_id_from_url(url)
        if not place_id:
            print(f"Could not extract place ID from {url}. Skipping...")
            continue
        
        # 상세 정보 가져오기
        place_info = get_place_info(place_id)
        if not place_info:
            print(f"Could not get place info for ID {place_id}. Skipping...")
            continue
        
        # 장소 객체 생성
        place_object = create_place_object(place_info, url)
        if not place_object:
            print(f"Could not create place object for {url}. Skipping...")
            continue
        
        # JSON에 추가
        data["places"].append(place_object)
        added_count += 1
        
        # 처리한 URL을 finished_urls.txt로 이동
        move_url_to_finished(url, target_file, finished_file)
        
        # API 요청 간격을 두어 서버 부하 방지
        time.sleep(1)
    
    # 수정일 업데이트
    data["modified"] = time.strftime("%Y-%m-%d")
    
    # 변경된 JSON 파일 저장
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    
    print(f"Done! Added {added_count} places to {json_file}")

if __name__ == "__main__":
    main() 