document.addEventListener('DOMContentLoaded', () => {
    const sliders = document.querySelectorAll('.slider-wrapper');
    sliders.forEach(wrapper => {
        initSlider(wrapper);
    });
});

function initSlider(wrapper) {
    // --- 1. 設定値の読み込み ---
    const config = {
        autoPlay: wrapper.dataset.autoPlay === 'true',
        duration: parseFloat(wrapper.dataset.duration) || 3.0,
        showItems: Math.max(1, parseInt(wrapper.dataset.show) || 1), // 表示枚数
        stepItems: Math.max(1, parseInt(wrapper.dataset.step) || 1), // 移動枚数
        loop: wrapper.dataset.loop !== 'false', 
        aspectRatio: wrapper.dataset.aspectRatio || "512/763", // 1スロットの比率
        maxWidth: wrapper.dataset.maxWidth || null,
        imgFit: wrapper.dataset.fit || "cover", 
        bgColor: wrapper.dataset.bg || "#eee"
    };

    // --- 2. 要素の取得 ---
    const container = wrapper.querySelector('.slider-container');
    const prevBtn = wrapper.querySelector('.prev');
    const nextBtn = wrapper.querySelector('.next');
    const statusIcon = wrapper.querySelector('.status-icon');
    const fsBtn = wrapper.querySelector('.fs-btn');
    const closeBtn = wrapper.querySelector('.close-btn');
    const slideItems = container.querySelectorAll('.slide-item');

    // --- 3. スタイルの適用 ---
    if (config.maxWidth) wrapper.style.maxWidth = config.maxWidth;
    wrapper.style.setProperty('--img-fit', config.imgFit);
    wrapper.style.setProperty('--bg-color', config.bgColor);

    // 1アイテムの幅を設定
    const itemWidthPercent = 100 / config.showItems;
    slideItems.forEach(item => {
        item.style.flex = `0 0 ${itemWidthPercent}%`;
        item.style.width = `${itemWidthPercent}%`;
    });

    /**
     * アスペクト比をコンテナに適用する（1スロット分 × 枚数）
     */
    const applyFinalRatio = (ratioStr) => {
        if (!container) return;
        if (ratioStr.includes('/')) {
            const [w, h] = ratioStr.split('/').map(val => parseFloat(val.trim()));
            if (!isNaN(w) && !isNaN(h)) {
                // コンテナ全体の比率 = (スロット幅 * 表示枚数) / 高さ
                const finalRatio = (w * config.showItems) / h;
                container.style.aspectRatio = finalRatio.toString();
            }
        } else {
            container.style.aspectRatio = ratioStr;
        }
    };

    if (config.aspectRatio === "auto") {
        const firstImg = container.querySelector('img');
        if (firstImg) {
            const calcAuto = () => {
                const r = firstImg.naturalWidth / firstImg.naturalHeight;
                applyFinalRatio(r.toString());
            };
            firstImg.complete ? calcAuto() : firstImg.addEventListener('load', calcAuto);
        }
    } else {
        applyFinalRatio(config.aspectRatio);
    }

    // --- 4. 状態管理 ---
    let currentIndex = 0;
    let autoSlideTimer;
    let isPlaying = config.autoPlay;

    const getTotalSlides = () => slideItems.length;
    const getItemWidth = () => container.getBoundingClientRect().width / config.showItems;
    
    // 最大インデックス（空欄を作らない限界値）
    const getMaxIndex = () => Math.max(0, getTotalSlides() - config.showItems);

    // スライド不要な場合の無効化処理
    if (getTotalSlides() <= config.showItems) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        isPlaying = false;
        container.style.overflowX = 'hidden';
        container.style.cursor = 'default';
    }

    const scrollToIndex = (index, instant = false) => {
        const itemWidth = getItemWidth();
        if (itemWidth <= 0) return;
        container.scrollTo({
            left: index * itemWidth,
            behavior: instant ? 'auto' : 'smooth'
        });
    };

    const handleResize = () => {
        setTimeout(() => {
            scrollToIndex(currentIndex, true);
        }, 150);
    };

    // --- 5. 同期処理 ---
    let isScrollingTimeout;
    container.addEventListener('scroll', () => {
        clearTimeout(isScrollingTimeout);
        isScrollingTimeout = setTimeout(() => {
            const itemWidth = getItemWidth();
            if (itemWidth > 0) {
                currentIndex = Math.round(container.scrollLeft / itemWidth);
            }
        }, 50);
    });

    // --- 6. 操作ロジック ---
    const slideNext = (isAuto = false) => {
        const maxIndex = getMaxIndex();
        if (maxIndex === 0) return;

        if (currentIndex >= maxIndex) {
            if (config.loop) currentIndex = 0;
            else { if (isAuto) { stopTimer(); isPlaying = false; showStatus("⏹ End"); } return; }
        } else {
            // ステップ分進めるが、空欄防止のため maxIndex を超えない
            currentIndex = Math.min(currentIndex + config.stepItems, maxIndex);
        }
        scrollToIndex(currentIndex);
    };

    const slidePrev = () => {
        const maxIndex = getMaxIndex();
        if (maxIndex === 0) return;

        if (currentIndex <= 0) {
            if (config.loop) currentIndex = maxIndex;
        } else {
            currentIndex = Math.max(currentIndex - config.stepItems, 0);
        }
        scrollToIndex(currentIndex);
    };

    // --- 7. タイマー・全画面制御 ---
    const startTimer = () => {
        if (getMaxIndex() === 0) return;
        stopTimer();
        autoSlideTimer = setInterval(() => slideNext(true), config.duration * 1000);
    };
    const stopTimer = () => clearInterval(autoSlideTimer);

    const showStatus = (text) => {
        if(!statusIcon || getMaxIndex() === 0) return;
        statusIcon.textContent = text;
        statusIcon.style.display = 'block';
        statusIcon.classList.remove('fade-anim');
        void statusIcon.offsetWidth; 
        statusIcon.classList.add('fade-anim');
    };

    const toggleAutoPlay = (e) => {
        if (e.target.tagName === 'BUTTON' || getMaxIndex() === 0) return;
        isPlaying ? (stopTimer(), isPlaying = false, showStatus("⏸ Paused")) 
                  : (startTimer(), isPlaying = true, showStatus("▶ Playing"));
    };

    const toggleFullscreen = () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else {
            if (wrapper.requestFullscreen) {
                wrapper.requestFullscreen().catch(() => enterCssFullscreen());
            } else {
                enterCssFullscreen();
            }
        }
    };

    const enterCssFullscreen = () => {
        wrapper.classList.add('ios-fullscreen');
        document.body.style.overflow = 'hidden'; 
        handleResize();
    };

    const exitCssFullscreen = () => {
        wrapper.classList.remove('ios-fullscreen');
        document.body.style.overflow = '';
        handleResize();
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    if(nextBtn) nextBtn.addEventListener('click', (e) => { 
        e.stopPropagation();
        if (isPlaying) { stopTimer(); startTimer(); } 
        slideNext(false); 
    });
    if(prevBtn) prevBtn.addEventListener('click', (e) => { 
        e.stopPropagation();
        if (isPlaying) { stopTimer(); startTimer(); } 
        slidePrev(); 
    });
    if(fsBtn) fsBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFullscreen(); });
    if(closeBtn) closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.fullscreenElement ? document.exitFullscreen() : exitCssFullscreen();
    });
    if(container) container.addEventListener('click', toggleAutoPlay);

    if (isPlaying) startTimer();
}

