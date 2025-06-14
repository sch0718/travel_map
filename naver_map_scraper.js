const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function scrapeNaverMap() {
  // 브라우저 시작
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 네이버 지도 접속
    await page.goto('https://map.naver.com/p/favorite/myPlace?c=15.00,0,0,0,dh');
    console.log('네이버 지도에 접속했습니다.');

    // 로그인 상태 확인 및 필요시 로그인
    await checkAndLogin(page);
    
    // 저장 버튼은 이미 선택되어 있을 수 있으므로, 그냥 넘어갑니다.
    console.log('저장 페이지에 있습니다.');
    
    // 페이지 로딩 대기 
    await page.waitForTimeout(3000);
    
    // 강남역 주변 맛집 버튼을 찾아 클릭
    // iframe 내부에 있을 수 있으므로 프레임 탐색
    const frames = page.frames();
    let folderListFrame;
    
    // 폴더 리스트가 있는 iframe 찾기
    for (const frame of frames) {
      const title = await frame.title().catch(() => '');
      if (title.includes('Open Place Folder List') || await frame.content().then(c => c.includes('강남역 주변 맛집')).catch(() => false)) {
        folderListFrame = frame;
        break;
      }
    }
    
    if (folderListFrame) {
      // 강남역 주변 맛집 버튼 찾기
      await folderListFrame.waitForSelector('text=강남역 주변 맛집', { timeout: 10000 });
      await folderListFrame.click('text=강남역 주변 맛집');
      console.log('강남역 주변 맛집을 클릭했습니다.');
    } else {
      // iframe 탐색 실패 시 직접 찾기 시도
      await page.waitForSelector('text=강남역 주변 맛집', { timeout: 10000 });
      await page.click('text=강남역 주변 맛집');
      console.log('강남역 주변 맛집을 클릭했습니다.');
    }
    
    // 장소 목록이 로드될 때까지 대기
    await page.waitForTimeout(3000);
    
    // 장소 목록 iframe 찾기
    let placeListFrame;
    
    // 먼저 id가 myPlaceBookmarkListIframe인 프레임을 찾습니다
    placeListFrame = page.frame({ name: 'myPlaceBookmarkListIframe' });
    
    // id로 찾지 못한 경우 다른 방법으로 시도
    if (!placeListFrame) {
      const updatedFrames = page.frames();
      
      for (const frame of updatedFrames) {
        // iframe id 확인
        const frameId = await frame.evaluate(() => {
          const iframe = document.querySelector('iframe');
          return iframe ? iframe.id : '';
        }).catch(() => '');
        
        if (frameId === 'myPlaceBookmarkListIframe') {
          placeListFrame = frame;
          break;
        }
        
        // 기존 방식으로도 검색 시도
        const title = await frame.title().catch(() => '');
        if (title.includes('Myplace Bookmark List') || await frame.content().then(c => c.includes('연희동칼국수')).catch(() => false)) {
          placeListFrame = frame;
          break;
        }
      }
    }
    
    if (!placeListFrame) {
      throw new Error('장소 목록 프레임을 찾을 수 없습니다.');
    }
    
    // URL을 저장할 파일 설정
    const outputFile = path.join(__dirname, 'target_urls.txt');
    
    // 파일 초기화 (이전 내용 삭제)
    fs.writeFileSync(outputFile, '');
    
    // 장소 목록에서 항목 찾기
    let placeItems = await placeListFrame.$$('li[class*="_place_info_card_"]');
    
    console.log(`_place_info_card_ 선택자로 ${placeItems.length}개 장소를 찾았습니다.`);
    
    // 장소 순회를 위한 준비
    if (!placeItems || placeItems.length === 0) {
      throw new Error('장소 목록을 찾을 수 없습니다. 선택자를 확인해주세요.');
    }
    
    console.log(`${placeItems.length}개의 장소를 처리합니다.`);
    
    // 각 장소 순회
    for (let i = 0; i < placeItems.length; i++) {
      // 장소 이름 가져오기
      const index = i; // 인덱스를 별도 변수로 저장
      const placeName = await placeItems[i].evaluate((el, index) => {
        // _place_info_card_ 클래스를 가진 li 요소에서 이름 찾기
        const nameElement = el.querySelector('strong, [class*="_title_"], [class*="name_"]');
        return nameElement ? nameElement.textContent.trim() : `장소 ${index+1}`;
      }, index);
      
      console.log(`${i+1}번째 장소를 클릭합니다: ${placeName}`);
      
      // li 요소 자체를 클릭하거나 li 내부의 적절한 요소 클릭
      try {
        // 먼저 li 요소 클릭 시도
        await placeItems[i].click();
      } catch (error) {
        console.log(`직접 클릭 실패, 대체 방법 시도: ${error.message}`);
        
        // 실패 시 내부 요소 찾아서 클릭
        const clickableElement = await placeItems[i].$('a, button, [role="button"]');
        if (clickableElement) {
          await clickableElement.click();
        } else {
          console.log('클릭 가능한 요소를 찾을 수 없습니다. 다음 항목으로 넘어갑니다.');
          continue;
        }
      }
      
      // 상세 정보 로딩 대기
      await page.waitForTimeout(3000);
      
      // 상세 정보 프레임 찾기 - id가 entryIframe인 프레임을 선택
      let detailFrame = page.frame({ name: 'entryIframe' });
      
      // ID로 찾지 못한 경우 다른 방법으로 시도
      if (!detailFrame) {
        console.log('entryIframe ID로 프레임을 찾을 수 없어 대체 방법을 시도합니다.');
        const detailFrames = page.frames();
        
        for (const frame of detailFrames) {
          // iframe id 확인
          const frameId = await frame.evaluate(() => {
            const iframe = document.querySelector('iframe');
            return iframe ? iframe.id : '';
          }).catch(() => '');
          
          if (frameId === 'entryIframe') {
            detailFrame = frame;
            break;
          }
          
          // 기존 방식으로도 검색 시도
          const title = await frame.title().catch(() => '');
          if (title.includes('Naver Place Entry') || await frame.content().then(c => c.includes('공유')).catch(() => false)) {
            detailFrame = frame;
            break;
          }
        }
      }
      
      if (!detailFrame) {
        console.log('상세 정보 프레임을 찾을 수 없습니다. 다음 항목으로 넘어갑니다.');
        continue;
      }
      
      // 공유 버튼 클릭
      await detailFrame.waitForSelector('text=공유', { timeout: 5000 }).catch(() => {});
      await detailFrame.click('text=공유').catch(e => {
        console.log('공유 버튼을 찾을 수 없습니다.', e);
      });
      
      // 공유 URL 찾기
      await page.waitForTimeout(1000);
      
      let url = null;
      try {
        // 지정된 클래스들을 가진 요소 찾기
        let copyUrlElement = null;
        
        // 각 클래스에 대해 순서대로 시도
        const classSelectors = [
          '._spi_input_copyurl',
          '._spi_copyurl_txt',
          '.spi_copyurl_url'
        ];
        
        for (const selector of classSelectors) {
          copyUrlElement = await detailFrame.$(selector);
          if (copyUrlElement) {
            console.log(`${selector} 클래스를 가진 요소를 찾았습니다.`);
            break;
          }
        }
        
        if (copyUrlElement) {
          // 요소의 텍스트 콘텐츠 가져오기
          url = await copyUrlElement.evaluate(el => {
            // input 요소인 경우 value 속성 사용
            if (el.tagName === 'INPUT') {
              return el.value;
            }
            // 그 외에는 텍스트 콘텐츠 사용
            return el.textContent || el.innerText;
          });
          console.log('URL 복사 요소를 찾았습니다:', url);
        } else {
          console.log('지정된 클래스를 가진 요소를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.log('URL 추출 중 오류:', error);
      }
      
        if (url) {
          // URL 정리 (공백 제거 및 기본 검증)
          let cleanUrl = url.trim();
          
          // URL 패턴 확인 및 수정
          if (!cleanUrl.includes('naver.me')) {
            console.log(`유효하지 않은 URL 형식: ${cleanUrl} - 건너뜁니다.`);
            continue; // 다음 항목으로 넘어감
          }
          
          // 프로토콜 없는 경우 추가
          if (!cleanUrl.startsWith('http')) {
            cleanUrl = `https://${cleanUrl}`;
          }
          
          console.log(`URL 수집: ${cleanUrl}`);
          
          // 파일에 URL 추가
          fs.appendFileSync(outputFile, cleanUrl + '\n');
        } else {
          console.log('URL을 찾을 수 없습니다. 이 항목은 건너뜁니다.');
        }
      
      // 닫기 버튼 클릭하여 공유 팝업 닫기
      await detailFrame.click('text=닫기').catch(() => {});
      
      // 다음 항목으로 가기 전에 잠시 대기
      await page.waitForTimeout(1000);
    }
    
    // 파일에 저장된 URL 개수 확인
    const fileContent = fs.readFileSync(outputFile, 'utf8');
    const urlCount = fileContent.split('\n').filter(line => line.trim() !== '').length;
    
    console.log(`총 ${urlCount}개의 URL을 수집했습니다.`);
    console.log(`결과가 ${outputFile}에 저장되었습니다.`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await browser.close();
  }
}

async function checkAndLogin(page) {
  // 로그인 필요 여부 확인
  const isLoginNeeded = await page.isVisible('text=로그인').catch(() => false);
  
  if (isLoginNeeded) {
    console.log('로그인이 필요합니다. 로그인을 시도합니다.');
    
    // 로그인 버튼 클릭
    await page.click('text=로그인');
    
    // 로그인 폼 입력
    await page.waitForSelector('#id', { timeout: 5000 });
    await page.fill('#id', 'sch0718');
    await page.fill('#pw', 'passw0rd)&!*');
    
    // 로그인 버튼 클릭
    await page.click('.btn_login, button:has-text("로그인")');
    
    // 로그인 완료 대기
    await page.waitForNavigation({ timeout: 10000 });
    console.log('로그인이 완료되었습니다.');
  } else {
    console.log('이미 로그인된 상태입니다.');
  }
}

// 스크립트 실행
scrapeNaverMap(); 