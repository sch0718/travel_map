from playwright.sync_api import sync_playwright
import os
import time

def main():
    with sync_playwright() as p:
        # 브라우저 시작
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        try:
            # 네이버 지도 접속
            page.goto('https://map.naver.com/p/favorite/myPlace?c=15.00,0,0,0,dh')
            print('네이버 지도에 접속했습니다.')
            
            # 로그인 상태 확인 및 필요시 로그인
            check_and_login(page)
            
            # 저장 버튼 클릭
            page.wait_for_selector('text=저장', timeout=10000)
            page.click('text=저장')
            print('저장 버튼을 클릭했습니다.')
            
            # 강남역 주변 맛집 클릭
            page.wait_for_selector('text=강남역 주변 맛집', timeout=10000)
            page.click('text=강남역 주변 맛집')
            print('강남역 주변 맛집을 클릭했습니다.')
            
            # 장소 목록이 있는 프레임 찾기
            page.wait_for_selector('iframe[name="searchIframe"]', timeout=10000)
            search_frame = page.frame(name='searchIframe')
            
            if not search_frame:
                raise Exception('searchIframe을 찾을 수 없습니다.')
            
            # URL을 저장할 파일 설정
            output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'target_urls.txt')
            
            # 기존 파일이 있으면 초기화
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write('')
            
            # 목록에서 장소 클릭하고 URL 수집 반복
            has_more_items = True
            last_height = 0
            urls = set()
            
            while has_more_items:
                # 현재 보이는 모든 장소 항목 가져오기
                place_items = search_frame.query_selector_all('.VLTHu')
                
                for i, item in enumerate(place_items):
                    # 이미 처리한 항목은 건너뛰기
                    current_height = search_frame.evaluate('(el) => el.offsetTop', item)
                    if current_height <= last_height:
                        continue
                    
                    # 항목 클릭
                    item.click()
                    print(f'{i+1}번째 장소를 클릭했습니다.')
                    
                    # 상세 정보 로딩 대기
                    page.wait_for_timeout(2000)
                    
                    # 상세 정보 프레임 찾기
                    entry_frame = page.frame(name='entryIframe')
                    if not entry_frame:
                        print('entryIframe을 찾을 수 없습니다. 다음 항목으로 넘어갑니다.')
                        continue
                    
                    try:
                        # 공유 버튼 클릭
                        entry_frame.wait_for_selector('._sGE0y', timeout=5000)
                        entry_frame.click('._sGE0y')
                        
                        # URL 복사 버튼이 있는 입력 필드 확인
                        entry_frame.wait_for_selector('._qRkjH', timeout=5000)
                        
                        # URL 직접 가져오기 (클립보드 접근 제한으로 인해)
                        url = entry_frame.evaluate('() => { const input = document.querySelector("._qRkjH"); return input ? input.value : null; }')
                        
                        if url:
                            print(f'URL 수집: {url}')
                            if url not in urls:
                                urls.add(url)
                                
                                # 파일에 URL 추가
                                with open(output_file, 'a', encoding='utf-8') as f:
                                    f.write(f'{url}\n')
                    except Exception as e:
                        print(f'URL 수집 중 오류 발생: {e}')
                
                # 마지막으로 클릭한 항목의 위치 저장
                if place_items:
                    last_height = search_frame.evaluate('(el) => el.offsetTop', place_items[-1])
                
                # 스크롤 다운
                previous_height = search_frame.evaluate('() => document.documentElement.scrollHeight')
                search_frame.evaluate('() => { window.scrollTo(0, document.documentElement.scrollHeight); }')
                page.wait_for_timeout(2000)
                
                # 스크롤 후 높이 변화 확인
                current_height = search_frame.evaluate('() => document.documentElement.scrollHeight')
                has_more_items = current_height > previous_height
                
                if not has_more_items:
                    print('모든 항목을 스크롤했습니다.')
            
            print(f'총 {len(urls)}개의 URL을 수집했습니다.')
            print(f'결과가 {output_file}에 저장되었습니다.')
            
        except Exception as e:
            print(f'오류 발생: {e}')
        finally:
            browser.close()

def check_and_login(page):
    # 로그인 필요 여부 확인
    try:
        is_login_needed = page.is_visible('text=로그인')
    except:
        is_login_needed = False
    
    if is_login_needed:
        print('로그인이 필요합니다. 로그인을 시도합니다.')
        
        # 로그인 버튼 클릭
        page.click('text=로그인')
        
        # 로그인 폼 입력
        page.wait_for_selector('#id', timeout=5000)
        page.fill('#id', 'sch0718')
        page.fill('#pw', 'passw0rd}&!*)')
        
        # 로그인 버튼 클릭
        page.click('.btn_login')
        
        # 로그인 완료 대기
        page.wait_for_navigation(timeout=10000)
        print('로그인이 완료되었습니다.')
    else:
        print('이미 로그인된 상태입니다.')

if __name__ == '__main__':
    main() 