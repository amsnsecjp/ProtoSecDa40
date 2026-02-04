// Game Configuration
const GAME_DURATION = 60; // seconds

// Difficulty Settings
const DIFFICULTY_SETTINGS = {
    easy: { name: "SCRIPT KIDDIE", speed: 1.5, spawnRate: 1000, goal: 3000 },
    normal: { name: "HACKER", speed: 3.0, spawnRate: 1000, goal: 10000 },
    hard: { name: "CISO", speed: 4.5, spawnRate: 1000, goal: 30000 }
};

// DOM Elements
const startScreen = document.getElementById('start-screen');
const difficultyScreen = document.getElementById('difficulty-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');

const scoreDisplay = document.getElementById('score');
const goalDisplay = document.getElementById('goal-display');
const timerDisplay = document.getElementById('timer');
const comboDisplay = document.getElementById('combo');
const jpWordDisplay = document.getElementById('japanese-word');
const romajiWordDisplay = document.getElementById('romaji-word');

const finalScoreDisplay = document.getElementById('final-score');
const finalComboDisplay = document.getElementById('final-combo');
const rankGradeDisplay = document.getElementById('rank-grade');
const resultTitle = document.getElementById('result-title');
const retryBtn = document.getElementById('retry-btn');
const interruptBtn = document.getElementById('interrupt-btn');
const backToTopBtn = document.getElementById('back-to-top-btn');
const quizInterruptBtn = document.getElementById('quiz-interrupt-btn');

const trackLanes = document.getElementById('track-lanes');
const diffButtons = document.querySelectorAll('.diff-btn');
const startStudyBtn = document.getElementById('start-study-btn');
const themeOptions = document.querySelectorAll('.theme-option');

// Screens
const introScreen = document.getElementById('intro-screen');
const introNextBtn = document.getElementById('intro-next-btn');
const readyScreen = document.getElementById('ready-screen');
const quizScreen = document.getElementById('quiz-screen');
const countdownScreen = document.getElementById('countdown-screen');
const countdownNumber = document.getElementById('countdown-number');
const quizTimeDisplay = document.getElementById('quiz-time');
const quizProgressDisplay = document.getElementById('quiz-current');
const quizQuestionText = document.getElementById('quiz-question-text');
const quizOptionsGrid = document.getElementById('quiz-options');
const typingStats = document.getElementById('typing-result-stats');
const quizStats = document.getElementById('quiz-result-stats');
const quizFinalScore = document.getElementById('quiz-final-score');
const quizReviewList = document.getElementById('quiz-review-list');

// Game State
let gameMode = 'typing';
let isPlaying = false;
let isPaused = false;
let currentDifficulty = 'normal';
let score = 0;
let timeLeft = GAME_DURATION;
let combo = 0;
let maxCombo = 0;

let introShown = false;

// Typing State
let activeWords = [];
let currentTargetIndex = -1;
let currentCharIndex = 0;
let gameLoopId = null;
let timerInterval = null;
let wordBag = [];

// Quiz State
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let quizTimerIdx = null;

// Initialize
function init() {
    window.addEventListener('keydown', handleGlobalKeyInput);

    // Buttons
    // Start Screen -> Intro (if first time) -> Difficulty
    startScreen.addEventListener('click', () => {
        if (!introShown) {
            updateScreen('intro');
        } else {
            updateScreen('difficulty');
        }
    });

    introNextBtn.addEventListener('click', () => {
        introShown = true;
        updateScreen('difficulty');
    });

    retryBtn.addEventListener('click', () => updateScreen('difficulty'));
    interruptBtn.addEventListener('click', togglePause);
    quizInterruptBtn.addEventListener('click', togglePause);

    // Back to Menu Logic (from Pause)
    backToTopBtn.addEventListener('click', () => {
        if (!isPaused) return;
        endGame('difficulty');
    });

    // Theme Selector
    themeOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            const color = e.target.dataset.color;
            setTheme(color);
        });
    });

    // Start Study (No Ready Screen)
    startStudyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startCountdown(() => startStudyMode());
    });

    // Start Typing Game (Ready Screen -> Countdown -> Start)
    diffButtons.forEach(btn => {
        if (btn.classList.contains('study-btn')) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const diff = e.currentTarget.dataset.diff;
            waitForReady(diff, () => {
                startCountdown(() => startGame(diff));
            });
        });
    });

    updateScreen('start');
}

function setTheme(color) {
    if (color === 'white') {
        document.documentElement.style.setProperty('--bg-color', '#f0f0f0');
        document.documentElement.style.setProperty('--text-color', '#111111');
        document.documentElement.style.setProperty('--accent-color', '#000000');
        document.documentElement.style.setProperty('--accent-dim', '#555555');
        document.documentElement.style.setProperty('--panel-bg', 'rgba(255, 255, 255, 0.9)');
        document.documentElement.style.setProperty('--word-bg', 'rgba(255, 255, 255, 0.95)');
        document.documentElement.style.setProperty('--hud-bg', 'rgba(230, 230, 230, 0.8)');
    } else {
        // Reset to Dark Mode defaults
        document.documentElement.style.setProperty('--bg-color', '#050510');
        document.documentElement.style.setProperty('--text-color', '#e0e0e0');
        document.documentElement.style.setProperty('--accent-color', color);
        document.documentElement.style.setProperty('--accent-dim', color);
        document.documentElement.style.setProperty('--panel-bg', 'rgba(0, 20, 0, 0.8)');
        document.documentElement.style.setProperty('--word-bg', 'rgba(0, 0, 0, 0.85)');
        document.documentElement.style.setProperty('--hud-bg', 'rgba(0, 0, 0, 0.5)');
    }
}

function updateScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // Reset specific classes
    gameScreen.classList.remove('expert-mode');

    if (screenName === 'start') {
        startScreen.classList.add('active');
    } else if (screenName === 'intro') {
        introScreen.classList.add('active');
    } else if (screenName === 'difficulty') {
        difficultyScreen.classList.add('active');
    } else if (screenName === 'game') {
        gameScreen.classList.add('active');
    } else if (screenName === 'quiz') {
        quizScreen.classList.add('active');
    } else if (screenName === 'result') {
        resultScreen.classList.add('active');
    } else if (screenName === 'countdown') {
        countdownScreen.classList.add('active');
    } else if (screenName === 'ready') {
        readyScreen.classList.add('active');
    }
}

const readyBackBtn = document.getElementById('ready-back-btn');
let readyKeyHandler = null;

function waitForReady(difficulty, onReady) {
    updateScreen('ready');

    // Custom Instruction for Expert
    const readyMsg = document.getElementById('ready-message');
    if (difficulty === 'expert') {
        readyMsg.innerHTML = "Press SPACE or ENTER to Start<br><span style='font-size:1.2em; color:#ffdd00; font-weight:bold; display:block; margin-top:15px; text-shadow:0 0 10px rgba(255,221,0,0.5);'>⚠️ In Game: Press ENTER to SKIP word ⚠️</span>";
    } else {
        readyMsg.innerText = "Press SPACE or ENTER to Start";
    }

    if (readyKeyHandler) window.removeEventListener('keydown', readyKeyHandler);

    readyKeyHandler = (e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
            window.removeEventListener('keydown', readyKeyHandler);
            readyKeyHandler = null;
            onReady();
        }
    };
    window.addEventListener('keydown', readyKeyHandler);
}


// --- Logic Updates for Navigation ---

// Init Listener for Ready Back
readyBackBtn.addEventListener('click', () => {
    if (readyKeyHandler) {
        window.removeEventListener('keydown', readyKeyHandler);
        readyKeyHandler = null;
    }
    updateScreen('difficulty');
});


function startCountdown(onComplete) {
    updateScreen('countdown');
    let count = 3;
    countdownNumber.innerText = count;

    const intv = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.innerText = count;
        } else {
            clearInterval(intv);
            onComplete();
        }
    }, 1000);
}

// --- Typing Game Logic ---

function togglePause() {
    if (!isPlaying) return;

    isPaused = !isPaused;

    // Determine which button to toggle based on mode
    const btn = gameMode === 'typing' ? interruptBtn : quizInterruptBtn;
    const controls = gameMode === 'typing' ? document.getElementById('control-cluster') : document.getElementById('quiz-control-cluster');

    if (isPaused) {
        btn.innerText = "RESUME";
        btn.style.color = "var(--accent-color)";
        btn.style.borderColor = "var(--accent-color)";

        // Move BackToTop button to current controls
        controls.appendChild(backToTopBtn);
        backToTopBtn.classList.remove('hidden');

        // Stop timer
        if (gameMode === 'typing') {
            clearInterval(timerInterval);
            cancelAnimationFrame(gameLoopId);
        } else {
            clearInterval(quizTimerIdx);
        }

    } else {
        btn.innerText = "INTERRUPT";
        btn.style.color = "";
        btn.style.borderColor = "";

        backToTopBtn.classList.add('hidden');

        // Resume
        if (gameMode === 'typing') {
            startTimer();
            gameLoopId = requestAnimationFrame(gameLoop);
        } else {
            startQuizTimer();
        }
    }
}

function startGame(difficulty) {
    gameMode = 'typing';
    currentDifficulty = difficulty;
    const settings = getDifficultySettings(difficulty);

    // Apply Expert Visuals
    if (currentDifficulty === 'expert') {
        gameScreen.classList.add('expert-mode');
    } else {
        gameScreen.classList.remove('expert-mode');
    }

    // Reset Stats
    score = 0;
    combo = 0;
    maxCombo = 0;
    timeLeft = GAME_DURATION;
    activeWords = [];
    wordBag = [];
    currentTargetIndex = -1;
    currentCharIndex = 0;
    isPaused = false;
    interruptBtn.innerText = "INTERRUPT";
    backToTopBtn.classList.add('hidden');

    // Clear display
    trackLanes.innerHTML = '';
    jpWordDisplay.innerText = '';
    romajiWordDisplay.innerText = '';

    scoreDisplay.innerText = score;
    goalDisplay.innerText = settings.goal;
    timerDisplay.innerText = timeLeft;
    comboDisplay.innerText = combo;

    updateScreen('game');
    isPlaying = true;

    // Start Loops
    startTimer();
    gameLoopId = requestAnimationFrame(gameLoop);
    spawnWord();
}

// --- Study Mode Logic ---

function startStudyMode() {
    gameMode = 'study';
    isPlaying = true; // Enable pause/game loop logic
    updateScreen('quiz');

    // Gen Questions
    // Shuffle termList
    const shuffled = [...termList].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);

    quizQuestions = selected.map((term, i) => {
        // First 5: EN -> JP answers
        // Last 5: JP -> EN answers
        const isEnToJp = i < 5;
        const qText = isEnToJp ? term.en : term.jp;
        const aText = isEnToJp ? term.jp : term.en;

        // Distractors
        const others = termList.filter(t => t !== term);
        const distractors = others.sort(() => 0.5 - Math.random()).slice(0, 3).map(t => isEnToJp ? t.jp : t.en);

        const options = [aText, ...distractors].sort(() => 0.5 - Math.random());

        return {
            term: term,
            type: isEnToJp ? 'EN_JP' : 'JP_EN',
            question: qText,
            correct: aText,
            options: options,
            userAnswer: null,
            isCorrect: false
        };
    });

    quizIndex = 0;
    quizScore = 0;
    quizTimer = 90;
    quizTimeDisplay.innerText = quizTimer;

    startQuizTimer();
    showQuestion();
}

let quizTimer = 90;
function startQuizTimer() {
    if (quizTimerIdx) clearInterval(quizTimerIdx);
    quizTimerIdx = setInterval(() => {
        quizTimer--;
        quizTimeDisplay.innerText = quizTimer;
        if (quizTimer <= 0) {
            endStudyGame();
        }
    }, 1000);
}

function showQuestion() {
    const q = quizQuestions[quizIndex];
    quizProgressDisplay.innerText = (quizIndex + 1);
    quizQuestionText.innerText = q.question;

    quizOptionsGrid.innerHTML = '';
    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.classList.add('quiz-option');
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(opt, btn);
        quizOptionsGrid.appendChild(btn);
    });
}

// Add at top with other elements: const quizFeedback = document.getElementById('quiz-feedback');

function handleAnswer(choice, btnElement) {
    const q = quizQuestions[quizIndex];
    q.userAnswer = choice;

    // Feedback Logic
    const quizFeedback = document.getElementById('quiz-feedback');
    quizFeedback.className = ''; // Reset

    if (choice === q.correct) {
        q.isCorrect = true;
        quizScore++;
        btnElement.classList.add('correct');

        // Show Circle
        quizFeedback.innerText = "〇";
        quizFeedback.classList.add('correct');
        quizFeedback.classList.add('show');
    } else {
        q.isCorrect = false;
        btnElement.classList.add('wrong');

        // Show Cross
        quizFeedback.innerText = "×";
        quizFeedback.classList.add('wrong');
        quizFeedback.classList.add('show');

        // Show correct one
        Array.from(quizOptionsGrid.children).forEach(b => {
            if (b.innerText === q.correct) b.classList.add('correct');
        });
    }

    // Wait a bit then next
    setTimeout(() => {
        quizFeedback.classList.remove('show'); // Hide
        quizIndex++;
        if (quizIndex >= quizQuestions.length) {
            endStudyGame();
        } else {
            showQuestion();
        }
    }, 800);
}

function endStudyGame() {
    clearInterval(quizTimerIdx);
    updateScreen('result');

    resultTitle.innerText = "STUDY SESSION COMPLETE";
    resultTitle.style.color = "#00aaff";

    typingStats.classList.add('hidden');
    quizStats.classList.remove('hidden');

    quizFinalScore.innerText = quizScore;

    // Generate Review List
    quizReviewList.innerHTML = '';
    quizQuestions.forEach((q, i) => {
        const div = document.createElement('div');
        div.classList.add('review-item');
        div.classList.add(q.isCorrect ? 'good' : 'bad');
        div.innerHTML = `
            <span class="review-q">${i + 1}. ${q.question}</span>
            <span class="review-a">${q.correct} ${q.isCorrect ? '⭕' : `(You: ${q.userAnswer || '-'}) ❌`}</span>
        `;
        quizReviewList.appendChild(div);
    });
}

// --- Common Logic ---

function getDifficultySettings(diff) {
    // Custom handling for Expert
    if (diff === 'expert') {
        return {
            name: "EXPERT",
            speed: 3.0, // Match Normal Speed
            spawnRate: 1000,
            goal: 10000 // Match Normal Goal
        };
    }
    return DIFFICULTY_SETTINGS[diff];
}

// ... (omitted shared code) ...

function updateTargetDisplay(wordObj) {
    jpWordDisplay.innerText = wordObj.wordData.jp;
    const enStr = wordObj.wordData.en;

    let html = '';
    for (let i = 0; i < enStr.length; i++) {
        if (i < currentCharIndex) {
            // Typed: Show char
            html += `<span class="char-typed">${enStr[i]}</span>`;
        } else {
            // Un-typed
            if (currentDifficulty === 'expert') {
                // Blind Mode: Show Underscore
                html += `<span class="char-untyped">_</span>`;
            } else {
                // Normal Mode: Show Char
                html += `<span class="char-untyped">${enStr[i]}</span>`;
            }
        }
    }
    romajiWordDisplay.innerHTML = html;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = timeLeft;
        if (timeLeft <= 0) {
            endGame(null);
        }
    }, 1000);
}

function endGame(redirectTarget = null) {
    isPlaying = false;
    clearInterval(timerInterval);
    cancelAnimationFrame(gameLoopId);

    // Reset Pause State
    isPaused = false;
    interruptBtn.innerText = "INTERRUPT";
    interruptBtn.style.color = "";
    interruptBtn.style.borderColor = "";
    quizInterruptBtn.innerText = "INTERRUPT";
    quizInterruptBtn.style.color = "";
    quizInterruptBtn.style.borderColor = "";
    backToTopBtn.classList.add('hidden');

    if (redirectTarget) {
        updateScreen(redirectTarget);
        return;
    }

    updateScreen('result');

    // Show Typing Stats, Hide Quiz Stats
    typingStats.classList.remove('hidden');
    quizStats.classList.add('hidden');

    const settings = getDifficultySettings(currentDifficulty);

    finalScoreDisplay.innerText = score;
    finalComboDisplay.innerText = maxCombo;

    // Determine Success/Fail
    if (score >= settings.goal) {
        resultTitle.innerText = "MISSION COMPLETE (SECURE)";
        resultTitle.style.color = "var(--accent-color)";
        rankGradeDisplay.innerText = "PROMOTED";
    } else {
        resultTitle.innerText = "SYSTEM COMPROMISED";
        resultTitle.style.color = "var(--error-color)";
        rankGradeDisplay.innerText = "TERMINATED";
    }
}

function spawnWord() {
    if (!isPlaying || isPaused || gameMode !== 'typing') return;

    // Strict single word enforcement
    if (activeWords.length > 0) return;

    // Refill bag if empty
    if (wordBag.length === 0) {
        wordBag = [...termList];
        // Fisher-Yates Shuffle
        for (let i = wordBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [wordBag[i], wordBag[j]] = [wordBag[j], wordBag[i]];
        }
    }

    const wordData = wordBag.pop();

    // Create Element with JP and EN
    const el = document.createElement('div');
    el.classList.add('word-entity');

    // Add random malware vision
    const version = Math.floor(Math.random() * 4) + 1; // 1 to 4
    el.classList.add(`malware-v${version}`);

    // Show ONLY Japanese text for ALL difficulties
    el.innerHTML = `<div class="word-jp">${wordData.jp}</div>`;

    // Vertical centering (Higher up to avoid collision)
    el.style.top = '35%';
    el.style.transform = 'translateY(-50%)';
    el.style.left = '0%'; // Start from LEFT

    trackLanes.appendChild(el);

    const settings = getDifficultySettings(currentDifficulty);

    activeWords.push({
        element: el,
        wordData: wordData,
        x: 0, // Starts at 0%
        speed: settings.speed, // Constant speed based on difficulty
        id: Date.now() + Math.random()
    });
}

function gameLoop() {
    if (!isPlaying || isPaused || gameMode !== 'typing') return;

    // Move logic
    activeWords.forEach((wordObj, index) => {
        // Move word RIGHT
        wordObj.x += (wordObj.speed * 0.05); // arbitrary scale factor
        wordObj.element.style.left = wordObj.x + '%';

        // Collision Check (Reached Company/Right side at ~90-100%)
        // The container is 100% wide. The word has width.
        // Let's say collision is at 90% to leave room for visual contact
        if (wordObj.x >= 90) {
            handleCollision(index);
        }
    });

    // Auto-spawn next word if empty and playing
    if (activeWords.length === 0 && isPlaying) {
        spawnWord();
    }

    // Auto-focus the single word if it exists and no target
    if (activeWords.length > 0 && currentTargetIndex === -1 && isPlaying) {
        currentTargetIndex = 0;
        currentCharIndex = 0;
        updateTargetDisplay(activeWords[0]);
        activeWords[0].element.classList.add('active-target');
    }

    gameLoopId = requestAnimationFrame(gameLoop);
}

function handleCollision(index) {
    const wordObj = activeWords[index];
    wordObj.element.remove();
    activeWords.splice(index, 1);

    // Reset target vars
    currentTargetIndex = -1;
    currentCharIndex = 0;
    romajiWordDisplay.innerHTML = "";
    jpWordDisplay.innerText = "";

    combo = 0; // Reset Combo
    comboDisplay.innerText = combo;
    score = Math.max(0, score - 500); // Lose Reliability
    scoreDisplay.innerText = score;

    // Visual effect on company zone
    const companyZone = document.getElementById('company-zone');
    companyZone.style.backgroundColor = 'rgba(255, 0, 85, 0.5)';
    setTimeout(() => companyZone.style.backgroundColor = '', 200);
}

function handleGlobalKeyInput(e) {
    if (gameMode !== 'typing') return; // Ignore keys in quiz

    if (!isPlaying || isPaused) {
        // Handled via click listeners now too, but keeping space for convenience
        if (startScreen.classList.contains('active') && e.code === 'Space') {
            updateScreen('difficulty');
        }
        return;
    }

    // Expert Mode: Enter to SKIP word
    if (gameMode === 'typing' && currentDifficulty === 'expert' && (e.code === 'Enter' || e.key === 'Enter')) {
        e.preventDefault();
        // Skip penalty: Reset combo, lose score same as collision (500)
        // Treat as collision/miss
        handleCollision(0); // 0 is index of active word (always 0 in single-flow)
        return;
    }

    if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

    // Ignore space during game (auto-skipped)
    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        return;
    }

    const inputChar = e.key.toUpperCase();

    // With single word, activeWords[0] is the only target
    if (activeWords.length === 0) return;

    const targetWordObj = activeWords[0];
    const targetStr = targetWordObj.wordData.en;

    if (inputChar === targetStr[currentCharIndex]) {
        // Correct Char
        currentCharIndex++;

        // Skip spaces if next char is space
        while (currentCharIndex < targetStr.length && targetStr[currentCharIndex] === ' ') {
            currentCharIndex++;
        }

        updateTargetDisplay(targetWordObj);

        // --- Combo Increase on Correct Keystroke ---
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        comboDisplay.innerText = combo;

        // --- Time Extension Logic ---
        // Every 25 chars:
        // 1st (25): +1s, 2nd (50): +2s, 3rd (75): +3s, Thereafter: +1s
        if (combo > 0 && combo % 25 === 0) {
            const count = combo / 25;
            let addTime = 1;
            if (count === 1) addTime = 1;
            else if (count === 2) addTime = 2;
            else if (count === 3) addTime = 3;
            else addTime = 1;

            timeLeft += addTime;
            timerDisplay.innerText = timeLeft;
            const timerBox = document.querySelector('.timer-box');
            timerBox.style.color = "var(--accent-color)";
            setTimeout(() => timerBox.style.color = "", 500);
        }

        if (currentCharIndex >= targetStr.length) {
            // Word Completed
            completeWord(0);
        }
    } else {
        // Mistype
        combo = 0; // Reset Combo on Mistype
        comboDisplay.innerText = combo;
        romajiWordDisplay.classList.add('shake');
        setTimeout(() => romajiWordDisplay.classList.remove('shake'), 200);
    }
}

function updateTargetDisplay(wordObj) {
    jpWordDisplay.innerText = wordObj.wordData.jp;
    const enStr = wordObj.wordData.en;

    let html = '';
    for (let i = 0; i < enStr.length; i++) {
        if (i < currentCharIndex) {
            // Typed: Show char
            html += `<span class="char-typed">${enStr[i]}</span>`;
        } else {
            // Un-typed
            if (currentDifficulty === 'expert') {
                // Blind Mode: Show Underscore (Space for visibility)
                html += `<span class="char-untyped" style="margin:0 2px;">_</span>`;
            } else {
                // Normal Mode: Show Char
                html += `<span class="char-untyped">${enStr[i]}</span>`;
            }
        }
    }
    romajiWordDisplay.innerHTML = html;
}

function completeWord(index) {
    const wordObj = activeWords[index];
    const length = wordObj.wordData.en.length;

    wordObj.element.remove();
    activeWords.splice(index, 1);

    currentTargetIndex = -1;
    currentCharIndex = 0;
    jpWordDisplay.innerText = "";
    romajiWordDisplay.innerText = "";

    // Score Calculation (Original + Length Bonus)
    const basePts = 50 + (length * 30);

    // Apply 1.5x Multiplier as requested
    const finalPts = Math.floor(basePts * 1.5);

    score += finalPts;
    scoreDisplay.innerText = score;
}

// Add shake animation
// Add shake animation (Moved to style.css)

init();
