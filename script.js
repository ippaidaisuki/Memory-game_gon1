// ゲーム設定と定数
const LEVEL_CONFIG = {
    easy: { cards: 12, pairs: 6, gridClass: 'grid-easy' },
    medium: { cards: 16, pairs: 8, gridClass: 'grid-medium' },
    hard: { cards: 24, pairs: 12, gridClass: 'grid-hard' }
};

// アプリのステート
let currentLevel = 'easy';
let cardsArray = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let secondsElapsed = 0;
let timerInterval = null;
let boardLocked = false;
let isFirstFlip = true;

// DOM要素の取得
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameBoard = document.getElementById('game-board');
const timerVal = document.getElementById('timer-val');
const movesVal = document.getElementById('moves-val');
const bestVal = document.getElementById('best-val');

const btnEasy = document.querySelector('.btn-easy');
const btnMedium = document.querySelector('.btn-medium');
const btnHard = document.querySelector('.btn-hard');
const btnBack = document.getElementById('btn-back');
const btnReset = document.getElementById('btn-reset');

// モーダル要素
const clearModal = document.getElementById('clear-modal');
const modalTime = document.getElementById('result-time');
const modalMoves = document.getElementById('result-moves');
const newBestBadge = document.getElementById('new-best-badge');
const btnPlayAgain = document.getElementById('btn-play-again');
const btnModalClose = document.getElementById('btn-modal-close');

// イベントリスナーの登録
btnEasy.addEventListener('click', () => startGame('easy'));
btnMedium.addEventListener('click', () => startGame('medium'));
btnHard.addEventListener('click', () => startGame('hard'));
btnBack.addEventListener('click', returnToTitle);
btnReset.addEventListener('click', resetGame);
btnPlayAgain.addEventListener('click', () => {
    closeModal();
    startGame(currentLevel);
});
btnModalClose.addEventListener('click', () => {
    closeModal();
    returnToTitle();
});

// ベストスコアの取得・保存処理 (Local Storage)
function getBestScores() {
    const scores = localStorage.getItem('memory_game_best_scores');
    return scores ? JSON.parse(scores) : { easy: null, medium: null, hard: null };
}

function saveBestScore(level, score) {
    const scores = getBestScores();
    scores[level] = score;
    localStorage.setItem('memory_game_best_scores', JSON.stringify(scores));
}

function displayBestScore(level) {
    const scores = getBestScores();
    const best = scores[level];
    if (best) {
        bestVal.textContent = `${best.moves} Moves (${formatTime(best.time)})`;
    } else {
        bestVal.textContent = '--';
    }
}

// ゲーム開始処理
function startGame(level) {
    currentLevel = level;
    matchedPairs = 0;
    moves = 0;
    secondsElapsed = 0;
    flippedCards = [];
    boardLocked = false;
    isFirstFlip = true;
    
    // UIの更新
    movesVal.textContent = '0';
    timerVal.textContent = '00:00';
    displayBestScore(level);
    
    // 画面の切り替え
    startScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    // グリッドの設定
    gameBoard.className = 'game-board'; // クラスのリセット
    gameBoard.classList.add(LEVEL_CONFIG[level].gridClass);
    
    // カードの生成とシャッフル
    setupDeck(level);
}

// タイトル画面へ戻る
function returnToTitle() {
    stopTimer();
    gameScreen.classList.remove('active');
    startScreen.classList.add('active');
}

// 現在のゲームをリセット
function resetGame() {
    stopTimer();
    startGame(currentLevel);
}

// 画像番号のフォーマッター (例: 1 -> "001")
function formatImageNum(num) {
    return String(num).padStart(3, '0');
}

// デッキの作成と描画
function setupDeck(level) {
    const config = LEVEL_CONFIG[level];
    const pairsCount = config.pairs;
    
    // 使用するカード画像番号のリストを作成 (1〜12)
    // 難易度に応じて必要なペア数分を用意
    let cardImages = [];
    for (let i = 1; i <= pairsCount; i++) {
        cardImages.push(i);
        cardImages.push(i); // ペアにするため2枚ずつ追加
    }
    
    // シャッフル
    shuffle(cardImages);
    
    // ボードのクリア
    gameBoard.innerHTML = '';
    
    // カードのDOMを生成して追加
    cardImages.forEach((imgNum, index) => {
        const cardElement = createCardElement(index, imgNum);
        gameBoard.appendChild(cardElement);
    });
}

// Fisher-Yates シャッフルアルゴリズム
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// カードDOMの構築
function createCardElement(uniqueId, imageNum) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.id = uniqueId;
    card.dataset.imageNum = imageNum;
    
    const cardInner = document.createElement('div');
    cardInner.classList.add('card-inner');
    
    // 裏面 (CARD.jpg)
    const cardBack = document.createElement('div');
    cardBack.classList.add('card-face', 'card-back');
    const backImg = document.createElement('img');
    backImg.src = 'images/CARD.jpg';
    backImg.alt = 'Card Back';
    cardBack.appendChild(backImg);
    
    // 表面 (ユーザー画像 2026.06.15._XXX.jpg)
    const cardFront = document.createElement('div');
    cardFront.classList.add('card-face', 'card-front');
    const frontImg = document.createElement('img');
    frontImg.src = `images/2026.06.15._${formatImageNum(imageNum)}.jpg`;
    frontImg.alt = `Card Pattern ${formatImageNum(imageNum)}`;
    cardFront.appendChild(frontImg);
    
    cardInner.appendChild(cardBack);
    cardInner.appendChild(cardFront);
    card.appendChild(cardInner);
    
    // クリックイベント
    card.addEventListener('click', () => handleCardClick(card));
    
    return card;
}

// カードのクリックイベントハンドラ
function handleCardClick(card) {
    // 操作ロック中、すでにめくられている、または一致済みの場合は無視
    if (boardLocked || card.classList.contains('flipped') || card.classList.contains('matched')) {
        return;
    }
    
    // 初めてめくった瞬間にタイマーを開始
    if (isFirstFlip) {
        startTimer();
        isFirstFlip = false;
    }
    
    // カードをめくる
    card.classList.add('flipped');
    flippedCards.push(card);
    
    // 2枚めくられた場合
    if (flippedCards.length === 2) {
        moves++;
        movesVal.textContent = moves;
        checkMatch();
    }
}

// 一致判定
function checkMatch() {
    const [card1, card2] = flippedCards;
    const isMatch = card1.dataset.imageNum === card2.dataset.imageNum;
    
    boardLocked = true;
    
    if (isMatch) {
        // ペアが揃った
        setTimeout(() => {
            card1.classList.add('matched');
            card2.classList.add('matched');
            
            flippedCards = [];
            matchedPairs++;
            boardLocked = false;
            
            // クリアチェック
            if (matchedPairs === LEVEL_CONFIG[currentLevel].pairs) {
                handleGameClear();
            }
        }, 300);
    } else {
        // 不一致
        setTimeout(() => {
            card1.classList.add('mismatched');
            card2.classList.add('mismatched');
        }, 300);
        
        // 揺れアニメーション完了後に元に戻す
        setTimeout(() => {
            card1.classList.remove('flipped', 'mismatched');
            card2.classList.remove('flipped', 'mismatched');
            flippedCards = [];
            boardLocked = false;
        }, 1000);
    }
}

// ゲームクリア処理
function handleGameClear() {
    stopTimer();
    
    const timeSpent = secondsElapsed;
    const finalMoves = moves;
    
    // スコア比較用オブジェクト
    const currentScore = { moves: finalMoves, time: timeSpent };
    const scores = getBestScores();
    const previousBest = scores[currentLevel];
    
    let isNewBest = false;
    
    if (!previousBest) {
        // 初めてのクリア
        isNewBest = true;
        saveBestScore(currentLevel, currentScore);
    } else {
        // 比較：手数が少ない方が勝ち、手数が同じなら時間が短い方が勝ち
        if (currentScore.moves < previousBest.moves) {
            isNewBest = true;
        } else if (currentScore.moves === previousBest.moves && currentScore.time < previousBest.time) {
            isNewBest = true;
        }
        
        if (isNewBest) {
            saveBestScore(currentLevel, currentScore);
        }
    }
    
    // クリアモーダルの表示設定
    modalTime.textContent = formatTime(timeSpent);
    modalMoves.textContent = finalMoves;
    newBestBadge.style.display = isNewBest ? 'inline-block' : 'none';
    
    // モーダルの表示
    setTimeout(() => {
        clearModal.classList.add('active');
    }, 600);
}

// モーダルを閉じる
function closeModal() {
    clearModal.classList.remove('active');
}

// タイマー機能
function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        secondsElapsed++;
        timerVal.textContent = formatTime(secondsElapsed);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

// 時間フォーマット関数 (秒 -> MM:SS)
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}
