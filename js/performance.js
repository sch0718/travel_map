/**
 * 여행 지도 웹앱 성능 모니터링 및 분석 도구
 * 웹 애플리케이션의 다양한 작업에 대한 성능을 측정하고 분석합니다.
 */

// 성능 측정 및 모니터링 도구
const performanceMonitor = {
    // 성능 측정 마크 저장
    marks: {},
    
    // 측정 기록
    metrics: {
        initialLoadTime: 0,      // 초기 로딩 시간
        mapRenderTime: 0,        // 지도 렌더링 시간
        dataFetchTime: 0,        // 데이터 가져오기 시간
        uiRenderTime: 0,         // UI 렌더링 시간
        interactionDelay: [],    // 상호작용 지연 시간 기록
        memoryUsage: [],         // 메모리 사용량 추적
        frameRates: [],          // 프레임 속도 추적
        firstMarkerTime: 0       // 첫 마커 표시 시간
    },
    
    // 성능 측정 시작
    start: function(name) {
        const startTime = performance.now();
        this.marks[name] = { start: startTime };
        
        // Performance API 마크 추가
        performance.mark(`${name}-start`);
        
        return startTime;
    },
    
    // 성능 측정 종료
    end: function(name) {
        if (!this.marks[name] || !this.marks[name].start) {
            console.warn(`${name} 측정이 시작되지 않았습니다.`);
            return;
        }
        
        const endTime = performance.now();
        this.marks[name].end = endTime;
        this.marks[name].duration = endTime - this.marks[name].start;
        
        // Performance API 마크 및 측정 추가
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        console.log(`성능 측정 - ${name}: ${this.marks[name].duration.toFixed(2)}ms`);
        
        // 표준 측정 항목 업데이트
        this.updateMetrics(name, this.marks[name].duration);
        
        // 느린 작업 감지
        if (this.marks[name].duration > 1000) { // 1초 이상 소요된 작업
            console.warn(`성능 경고 - ${name}이(가) ${this.marks[name].duration.toFixed(2)}ms 소요됨`);
            
            // 개발 환경에서만 성능 경고 표시
            if (process.env.NODE_ENV !== 'production') {
                this.showPerformanceWarning(name, this.marks[name].duration);
            }
        }
        
        return this.marks[name].duration;
    },
    
    // 표준 측정 항목 업데이트
    updateMetrics: function(name, duration) {
        // 표준 측정 항목에 따라 업데이트
        switch(name) {
            case 'initialLoad':
                this.metrics.initialLoadTime = duration;
                break;
            case 'mapRender':
                this.metrics.mapRenderTime = duration;
                break;
            case 'dataFetch':
                this.metrics.dataFetchTime = duration;
                break;
            case 'uiRender':
                this.metrics.uiRenderTime = duration;
                break;
            case 'firstMarker':
                this.metrics.firstMarkerTime = duration;
                break;
            case 'interaction':
                this.metrics.interactionDelay.push({
                    timestamp: Date.now(),
                    duration: duration
                });
                // 최대 100개 항목만 유지
                if (this.metrics.interactionDelay.length > 100) {
                    this.metrics.interactionDelay.shift();
                }
                break;
        }
    },
    
    // 메모리 사용량 측정
    measureMemory: function() {
        if (window.performance && window.performance.memory) {
            const memory = {
                timestamp: Date.now(),
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
            
            this.metrics.memoryUsage.push(memory);
            
            // 최대 100개 항목만 유지
            if (this.metrics.memoryUsage.length > 100) {
                this.metrics.memoryUsage.shift();
            }
            
            // 메모리 사용량이 높으면 경고
            const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            if (memoryUsagePercent > 80) {
                console.warn(`메모리 사용량 경고: ${memoryUsagePercent.toFixed(2)}%`);
            }
            
            return memory;
        }
        
        return null;
    },
    
    // 프레임 속도(FPS) 측정 시작
    startFPSMonitoring: function() {
        let frameCount = 0;
        let lastTime = performance.now();
        let frameTimes = [];
        
        const measureFPS = () => {
            const now = performance.now();
            const elapsed = now - lastTime;
            
            // 프레임 간격 기록
            if (lastTime) {
                frameTimes.push(elapsed);
                
                // 최대 100개 프레임 시간만 유지
                if (frameTimes.length > 100) {
                    frameTimes.shift();
                }
            }
            
            frameCount++;
            lastTime = now;
            
            // 1초마다 FPS 계산
            if (elapsed > 1000) {
                const fps = Math.round((frameCount * 1000) / elapsed);
                
                this.metrics.frameRates.push({
                    timestamp: Date.now(),
                    fps: fps,
                    // 평균 프레임 시간
                    avgFrameTime: frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length
                });
                
                // 최대 100개 FPS 기록만 유지
                if (this.metrics.frameRates.length > 100) {
                    this.metrics.frameRates.shift();
                }
                
                // FPS가 낮으면 경고
                if (fps < 30) {
                    console.warn(`낮은 FPS 경고: ${fps} FPS`);
                }
                
                frameCount = 0;
                frameTimes = [];
            }
            
            this.fpsRequestId = requestAnimationFrame(measureFPS);
        };
        
        this.fpsRequestId = requestAnimationFrame(measureFPS);
    },
    
    // 프레임 속도 측정 중지
    stopFPSMonitoring: function() {
        if (this.fpsRequestId) {
            cancelAnimationFrame(this.fpsRequestId);
            this.fpsRequestId = null;
        }
    },
    
    // 성능 경고 표시
    showPerformanceWarning: function(name, duration) {
        // 개발 환경에서만 UI에 경고 표시
        const warningDiv = document.createElement('div');
        warningDiv.className = 'performance-warning';
        warningDiv.innerHTML = `
            <strong>성능 경고:</strong> ${name} 작업이 ${duration.toFixed(2)}ms 소요됨
            <span class="close-warning">&times;</span>
        `;
        
        document.body.appendChild(warningDiv);
        
        // 5초 후 자동으로 경고 닫기
        setTimeout(() => {
            if (warningDiv.parentNode) {
                warningDiv.parentNode.removeChild(warningDiv);
            }
        }, 5000);
        
        // 닫기 버튼 클릭 이벤트
        const closeBtn = warningDiv.querySelector('.close-warning');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (warningDiv.parentNode) {
                    warningDiv.parentNode.removeChild(warningDiv);
                }
            });
        }
    },
    
    // 모든 측정 결과 가져오기
    getAll: function() {
        return this.marks;
    },
    
    // 특정 측정 결과 가져오기
    get: function(name) {
        return this.marks[name];
    },
    
    // 성능 메트릭 데이터 가져오기
    getMetrics: function() {
        // 메모리 사용량 측정 추가
        this.measureMemory();
        
        return this.metrics;
    },
    
    // 모든 측정 결과 및 메트릭 리셋
    reset: function() {
        this.marks = {};
        this.metrics = {
            initialLoadTime: 0,
            mapRenderTime: 0,
            dataFetchTime: 0,
            uiRenderTime: 0,
            interactionDelay: [],
            memoryUsage: [],
            frameRates: [],
            firstMarkerTime: 0
        };
        
        performance.clearMarks();
        performance.clearMeasures();
    },
    
    // 성능 보고서 생성
    generateReport: function() {
        // 현재 메트릭 가져오기
        const metrics = this.getMetrics();
        
        // 평균 상호작용 지연 계산
        const avgInteractionDelay = metrics.interactionDelay.length > 0
            ? metrics.interactionDelay.reduce((sum, record) => sum + record.duration, 0) / metrics.interactionDelay.length
            : 0;
        
        // 평균 FPS 계산
        const avgFPS = metrics.frameRates.length > 0
            ? metrics.frameRates.reduce((sum, record) => sum + record.fps, 0) / metrics.frameRates.length
            : 0;
        
        // 최근 메모리 사용량
        const latestMemory = metrics.memoryUsage.length > 0
            ? metrics.memoryUsage[metrics.memoryUsage.length - 1]
            : null;
        
        // 보고서 데이터 생성
        const report = {
            timestamp: Date.now(),
            initialLoadTime: metrics.initialLoadTime,
            mapRenderTime: metrics.mapRenderTime,
            dataFetchTime: metrics.dataFetchTime,
            uiRenderTime: metrics.uiRenderTime,
            firstMarkerTime: metrics.firstMarkerTime,
            avgInteractionDelay: avgInteractionDelay,
            avgFPS: avgFPS,
            memoryUsage: latestMemory
                ? {
                    total: latestMemory.totalJSHeapSize / (1024 * 1024),  // MB
                    used: latestMemory.usedJSHeapSize / (1024 * 1024),    // MB
                    limit: latestMemory.jsHeapSizeLimit / (1024 * 1024),  // MB
                    usagePercent: (latestMemory.usedJSHeapSize / latestMemory.jsHeapSizeLimit) * 100
                }
                : null,
            userAgent: navigator.userAgent,
            screenResolution: {
                width: window.screen.width,
                height: window.screen.height
            },
            devicePixelRatio: window.devicePixelRatio || 1
        };
        
        console.log('성능 보고서:', report);
        return report;
    },
    
    // 성능 데이터 시각화 (개발 모드에서만 사용)
    visualizePerformance: function() {
        // 성능 시각화를 위한 요소가 이미 있는지 확인
        let perfPanel = document.getElementById('performance-panel');
        
        if (!perfPanel) {
            // 성능 패널 요소 생성
            perfPanel = document.createElement('div');
            perfPanel.id = 'performance-panel';
            perfPanel.className = 'performance-panel';
            perfPanel.innerHTML = `
                <div class="perf-header">
                    <h3>성능 모니터링</h3>
                    <button id="perf-close">닫기</button>
                </div>
                <div class="perf-content">
                    <div class="perf-metrics">
                        <div class="perf-metric">
                            <span>초기 로딩:</span>
                            <span id="perf-initial-load">-</span>
                        </div>
                        <div class="perf-metric">
                            <span>지도 렌더링:</span>
                            <span id="perf-map-render">-</span>
                        </div>
                        <div class="perf-metric">
                            <span>데이터 로딩:</span>
                            <span id="perf-data-fetch">-</span>
                        </div>
                        <div class="perf-metric">
                            <span>UI 렌더링:</span>
                            <span id="perf-ui-render">-</span>
                        </div>
                        <div class="perf-metric">
                            <span>첫 마커 표시:</span>
                            <span id="perf-first-marker">-</span>
                        </div>
                        <div class="perf-metric">
                            <span>상호작용 지연:</span>
                            <span id="perf-interaction">-</span>
                        </div>
                        <div class="perf-metric">
                            <span>FPS:</span>
                            <span id="perf-fps">-</span>
                        </div>
                        <div class="perf-metric">
                            <span>메모리 사용량:</span>
                            <span id="perf-memory">-</span>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(perfPanel);
            
            // 닫기 버튼 이벤트 리스너
            document.getElementById('perf-close').addEventListener('click', () => {
                perfPanel.style.display = 'none';
            });
        } else {
            perfPanel.style.display = 'block';
        }
        
        // 패널 데이터 업데이트 함수
        const updatePerfPanel = () => {
            const metrics = this.getMetrics();
            
            // 메트릭 업데이트
            document.getElementById('perf-initial-load').textContent = 
                `${metrics.initialLoadTime.toFixed(2)}ms`;
            
            document.getElementById('perf-map-render').textContent = 
                `${metrics.mapRenderTime.toFixed(2)}ms`;
            
            document.getElementById('perf-data-fetch').textContent = 
                `${metrics.dataFetchTime.toFixed(2)}ms`;
            
            document.getElementById('perf-ui-render').textContent = 
                `${metrics.uiRenderTime.toFixed(2)}ms`;
            
            document.getElementById('perf-first-marker').textContent = 
                `${metrics.firstMarkerTime.toFixed(2)}ms`;
            
            // 평균 상호작용 지연
            const avgInteractionDelay = metrics.interactionDelay.length > 0
                ? metrics.interactionDelay.reduce((sum, record) => sum + record.duration, 0) / metrics.interactionDelay.length
                : 0;
            document.getElementById('perf-interaction').textContent = 
                `${avgInteractionDelay.toFixed(2)}ms`;
            
            // 평균 FPS
            const avgFPS = metrics.frameRates.length > 0
                ? metrics.frameRates.reduce((sum, record) => sum + record.fps, 0) / metrics.frameRates.length
                : 0;
            document.getElementById('perf-fps').textContent = 
                `${avgFPS.toFixed(1)}`;
            
            // 메모리 사용량
            const latestMemory = metrics.memoryUsage.length > 0
                ? metrics.memoryUsage[metrics.memoryUsage.length - 1]
                : null;
            
            if (latestMemory) {
                const usedMB = (latestMemory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
                const totalMB = (latestMemory.totalJSHeapSize / (1024 * 1024)).toFixed(1);
                const limitMB = (latestMemory.jsHeapSizeLimit / (1024 * 1024)).toFixed(1);
                document.getElementById('perf-memory').textContent = 
                    `${usedMB}MB / ${limitMB}MB`;
            }
            
            // 500ms마다 업데이트
            setTimeout(updatePerfPanel, 500);
        };
        
        // 업데이트 시작
        updatePerfPanel();
    }
};

// 페이지 로드 완료 후 성능 모니터링 시작
window.addEventListener('load', () => {
    // FPS 모니터링 시작
    performanceMonitor.startFPSMonitoring();
    
    // 초기 메모리 측정
    performanceMonitor.measureMemory();
    
    // 개발 환경에서만 성능 패널 표시 버튼 추가
    if (process.env.NODE_ENV !== 'production') {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-performance';
        toggleBtn.className = 'toggle-performance-btn';
        toggleBtn.textContent = '성능 모니터링';
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.bottom = '10px';
        toggleBtn.style.right = '10px';
        toggleBtn.style.zIndex = '9999';
        
        toggleBtn.addEventListener('click', () => {
            performanceMonitor.visualizePerformance();
        });
        
        document.body.appendChild(toggleBtn);
    }
    
    // 10초마다 메모리 측정
    setInterval(() => {
        performanceMonitor.measureMemory();
    }, 10000);
});

// 전역 성능 모니터 노출
window.performanceMonitor = performanceMonitor; 