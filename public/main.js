const socket = io();

// ====================================
// 多言語辞書 (i18n) 定義
// ====================================
const translations = {
    ja: {
        manualBtn: "📖 マニュアル",
        settingsBtn: "⚙️ 設定",
        creditsBtn: "ℹ️ クレジット",
        leaveBtn: "🚪 退出",
        manualTitle: "遊び方・ルール",
        settingsTitle: "画面明度・言語・サウンド",
        creditsTitle: "クレジット",
        leaveTitle: "部屋から退出",
        loadingText: "Loading...",
        namePlaceholder: "プレイヤー名を入力",
        roomPlaceholder: "ルームID (例: 1234)",
        ruleStack: "ドロー累積（+2/+4重ね）ルール",
        ruleSwap: "手札交換カード（スワップ）を含める",
        ruleSpectator: "観戦モード（オン）｜途中参加モード（オフ）",
        createRoomBtn: "部屋を作る",
        joinRoomBtn: "部屋に参加",
        waitingText: "待機中...",
        playersHeading: "プレイヤー",
        discardLabel: "場のカード:",
        drawBtn: "山札から引く",
        myHandHeading: "あなたの手札",
        colorPickerPrompt: "変更する色を選んでください",
        swapPrompt: "手札を交換する相手を選んでください",
        settingsModalTitle: "⚙️ システム設定",
        brightnessLabel: "☀️ 画面の明度",
        soundLabel: "🔊 サウンド効果 (SE)",
        langLabel: "🌐 言語 / Language",
        closeBtn: "閉じる",
        manualModalTitle: "📖 ゲームマニュアル",
        creditsModalTitle: "ℹ️ クレジット",
        creditsBody: "<strong>UNO Online Multiplayer</strong><br>Powered by Node.js, Express & Socket.IO<br>UI / Visual Effects: Custom Dark-Wood & Bloom CSS",
        gameOverTitle: "GAME OVER",
        lobbyBtn: "ロビーへ",
        spectatorModeMsg: "👀 観戦モード中（試合を観戦しています）",
        myTurnMsg: "★ あなたの番です！出せるカードを場に出すか、山札から引くか、UNOボタンを押してください",
        drawNBtn: (n) => `山札から ${n}枚引く`,
        stackWarning: (n) => `🔥 警告！+${n} 累積中！カードを重ねるか、山札から ${n}枚 引いてください`,
        stackingInfo: (n) => `⚠️ 現在 +${n} 累積中！次の人の運命やいかに…`,
        waitingTurn: "相手のターンを待っています...",
        spectatorsLabel: (names) => `👀 観戦者: ${names}`,
        noHandSpectator: "※あなたは現在観戦中です（手札はありません）",
        declaredBadge: "✔ 宣言済み！",
        reportPenaltyBtn: "⚠️ UNO言い忘れ指摘！",
        swappedNotice: (p1, p2) => `🔄 ${p1} が ${p2} と手札を交換しました！`,
        penaltyNotice: (name) => `⚠️ ${name} はUNO宣言を忘れていたためペナルティ！(2枚ドロー)`,
        stackPenalty: (name, n) => `💥 ${name} は累積ペナルティで ${n}枚 引かされました！`,
        winnerMsg: (name) => `${name} の勝利です！`,
        manualHtml: `
            <li><strong>基本ルール：</strong>場に出ているカードと「同じ色」または「同じ数字・記号」のカードを出せます。</li>
            <li><strong>操作方法：</strong>出せるカードをドラッグ＆ドロップで場に出すか、タップ（クリック）で出せます。</li>
            <li><strong>UNO宣言：</strong>手札が残り1枚になったら「🔥 UNO!」ボタンを押してください。忘れると他プレイヤーの指摘で2枚ドローのペナルティになります。</li>
            <li><strong>ドロー累積：</strong>+2や+4に対して同じカードを重ねて次の人へ押し付けることができます（ロビー設定でON/OFF可能）。</li>
            <li><strong>スワップ（⇄）：</strong>任意の相手1人と手札を丸ごと交換し、好きな色を指定できます。</li>
        `
    },
    en: {
        manualBtn: "📖 Manual",
        settingsBtn: "⚙️ Settings",
        creditsBtn: "ℹ️ Credits",
        leaveBtn: "🚪 Leave",
        manualTitle: "How to Play & Rules",
        settingsTitle: "Brightness, Language & Sound",
        creditsTitle: "Credits",
        leaveTitle: "Leave Room",
        loadingText: "Loading...",
        namePlaceholder: "Enter your name",
        roomPlaceholder: "Room ID (e.g. 1234)",
        ruleStack: "Stacking Rule (+2 / +4)",
        ruleSwap: "Include Swap Hand Cards",
        ruleSpectator: "Spectator Mode (On) | Late-Join (Off)",
        createRoomBtn: "Create Room",
        joinRoomBtn: "Join Room",
        waitingText: "Waiting...",
        playersHeading: "Players",
        discardLabel: "Discard Pile:",
        drawBtn: "Draw Card",
        myHandHeading: "Your Hand",
        colorPickerPrompt: "Choose a color",
        swapPrompt: "Choose a player to swap hands with",
        settingsModalTitle: "⚙️ System Settings",
        brightnessLabel: "☀️ Brightness",
        soundLabel: "🔊 Sound Effects (SE)",
        langLabel: "🌐 Language",
        closeBtn: "Close",
        manualModalTitle: "📖 Game Manual",
        creditsModalTitle: "ℹ️ Credits",
        creditsBody: "<strong>UNO Online Multiplayer</strong><br>Powered by Node.js, Express & Socket.IO<br>UI / Visual Effects: Custom Dark-Wood & Bloom CSS",
        gameOverTitle: "GAME OVER",
        lobbyBtn: "Back to Lobby",
        spectatorModeMsg: "👀 Spectating mode (Watching the match)",
        myTurnMsg: "★ Your turn! Play a card, draw from the deck, or call UNO!",
        drawNBtn: (n) => `Draw ${n} cards`,
        stackWarning: (n) => `🔥 Warning! +${n} stacking! Play a card or draw ${n} cards`,
        stackingInfo: (n) => `⚠️ +${n} penalty stacked! What's next...`,
        waitingTurn: "Waiting for opponent's turn...",
        spectatorsLabel: (names) => `👀 Spectators: ${names}`,
        noHandSpectator: "※ You are currently spectating (No hand)",
        declaredBadge: "✔ Called!",
        reportPenaltyBtn: "⚠️ Call UNO Failure!",
        swappedNotice: (p1, p2) => `🔄 ${p1} swapped hands with ${p2}!`,
        penaltyNotice: (name) => `⚠️ ${name} forgot to call UNO and drew 2 penalty cards!`,
        stackPenalty: (name, n) => `💥 ${name} took ${n} cards from the accumulated penalty!`,
        winnerMsg: (name) => `${name} wins the game!`,
        manualHtml: `
            <li><strong>Basic Rules:</strong> Match the top card by color, number, or symbol.</li>
            <li><strong>Controls:</strong> Drag & drop or tap a playable card to play.</li>
            <li><strong>UNO Call:</strong> Press the "🔥 UNO!" button when you have 1 card left. Forget to call and get a 2-card penalty if reported!</li>
            <li><strong>Stacking:</strong> Stack +2 or +4 cards onto the previous one to pass the penalty to the next player.</li>
            <li><strong>Swap (⇄):</strong> Swap your entire hand with any chosen player and pick a new color.</li>
        `
    }
};

let currentLang = navigator.language && navigator.language.startsWith('en') ? 'en' : 'ja';

function t(key, ...args) {
    const dict = translations[currentLang] || translations.ja;
    const val = dict[key] || translations.ja[key] || key;
    return typeof val === 'function' ? val(...args) : val;
}

function applyLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', t(key));
    });

    const manualList = document.getElementById('manual-list-content');
    if (manualList) manualList.innerHTML = t('manualHtml');

    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = lang;
}

window.addEventListener('DOMContentLoaded', () => {
    applyLanguage(currentLang);
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.onchange = (e) => {
            applyLanguage(e.target.value);
        };
    }
});

const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');

const playerNameInput = document.getElementById('player-name-input');
const roomIdInput = document.getElementById('room-id-input');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');

const currentRoomDisplay = document.getElementById('current-room-display');
const turnInfo = document.getElementById('turn-info');
const playerList = document.getElementById('player-list');
const handDiv = document.getElementById('hand');
const drawBtn = document.getElementById('draw-btn');
const unoBtn = document.getElementById('uno-btn');
const colorPickerModal = document.getElementById('color-picker-modal');
const swapPlayerModal = document.getElementById('swap-player-modal');
const swapPlayerButtons = document.getElementById('swap-player-buttons');

const unoOverlay = document.getElementById('uno-overlay');
const unoScrollingText = document.getElementById('uno-scrolling-text');
let unoAnimationTimeout = null;

let myId = '';
let currentRoomId = '';
let latestGameState = null;
let myCurrentHand = [];
let previousHandLength = 0;
let pendingWildCardIndex = null;
let pendingSwapCardIndex = null;
let selectedSwapTargetId = null;
let hasDeclaredUnoThisTurn = false;
let isMeSpectator = false;

function showLoading(text = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const textEl = overlay ? overlay.querySelector('.loading-text') : null;
    if (textEl) textEl.innerText = text;
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

const menuManualBtn = document.getElementById('menu-manual-btn');
const menuSettingsBtn = document.getElementById('menu-settings-btn');
const menuCreditsBtn = document.getElementById('menu-credits-btn');
const menuLeaveBtn = document.getElementById('menu-leave-btn');
const brightnessSlider = document.getElementById('brightness-slider');
const brightnessVal = document.getElementById('brightness-val');

if (menuManualBtn) {
    menuManualBtn.onclick = () => { document.getElementById('manual-modal').style.display = 'flex'; };
}
if (menuSettingsBtn) {
    menuSettingsBtn.onclick = () => { document.getElementById('settings-modal').style.display = 'flex'; };
}
if (menuCreditsBtn) {
    menuCreditsBtn.onclick = () => { document.getElementById('credits-modal').style.display = 'flex'; };
}
if (menuLeaveBtn) {
    menuLeaveBtn.onclick = () => {
        if (confirm(currentLang === 'en' ? 'Leave the room and return to lobby?' : '現在の部屋から退出してロビーに戻りますか？')) {
            location.reload();
        }
    };
}

if (brightnessSlider) {
    brightnessSlider.oninput = (e) => {
        const val = e.target.value;
        if (brightnessVal) brightnessVal.innerText = val;
        document.body.style.filter = `brightness(${val}%)`;
    };
}

window.closeSysModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
};

socket.on('connect', () => { myId = socket.id; });

createRoomBtn.onclick = () => {
    const randomRoom = Math.floor(1000 + Math.random() * 9000).toString();
    roomIdInput.value = randomRoom;
    joinRoom();
};

joinRoomBtn.onclick = () => { joinRoom(); };

function joinRoom() {
    const roomId = roomIdInput.value.trim();
    const name = playerNameInput.value.trim() || (currentLang === 'en' ? 'Player' : 'プレイヤー');

    if (!roomId) {
        alert(currentLang === 'en' ? 'Please enter a room ID' : 'ルームIDを入力してください');
        return;
    }

    const stackCheckbox = document.getElementById('stack-rule-checkbox');
    const swapCheckbox = document.getElementById('swap-rule-checkbox');
    const spectatorCheckbox = document.getElementById('spectator-rule-checkbox');
    
    const isStackEnabled = stackCheckbox ? stackCheckbox.checked : true;
    const allowSwapCard = swapCheckbox ? swapCheckbox.checked : true;
    const allowSpectator = spectatorCheckbox ? spectatorCheckbox.checked : true;

    currentRoomId = roomId;
    showLoading(currentLang === 'en' ? 'Joining room...' : '卓を囲んでいます...');
    socket.emit('joinRoom', { roomId, name, isStackEnabled, allowSwapCard, allowSpectator });
}

socket.on('joinedRoom', (roomId) => {
    hideLoading();
    lobbyScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    currentRoomDisplay.innerText = `Room ID: ${roomId}`;
    if (menuLeaveBtn) menuLeaveBtn.style.display = 'inline-block';
});

socket.on('unoDeclared', ({ playerId, playerName }) => {
    if (unoAnimationTimeout) clearTimeout(unoAnimationTimeout);

    if (playerId === myId) {
        unoScrollingText.innerText = currentLang === 'en' ? 'UNO!' : 'UNO！';
    } else {
        unoScrollingText.innerText = currentLang === 'en' ? `${playerName} called UNO!` : `${playerName}がUNOを宣言した`;
    }

    unoOverlay.style.display = 'none';
    void unoOverlay.offsetWidth;
    unoOverlay.style.display = 'flex';

    unoAnimationTimeout = setTimeout(() => { unoOverlay.style.display = 'none'; }, 2600);
});

function getCardLabel(card) {
    if (!card) return '';
    if (card.type === 'number') return card.value;
    if (card.value === 'skip') return '🚫';
    if (card.value === 'reverse') return '🔄';
    if (card.value === 'draw2') return '+2';
    if (card.value === 'wild') return '🌈';
    if (card.value === 'wild_draw4') return '+4';
    if (card.value === 'swap') return '⇄';
    return card.value;
}

function createCardElement(card) {
    const cardDiv = document.createElement('div');
    const colorClass = (card.value === 'wild_draw4' || card.value === 'swap') ? 'wild' : card.color;
    cardDiv.className = `card ${colorClass}`;

    const label = getCardLabel(card);
    const cornerTop = document.createElement('div');
    cornerTop.className = 'card-corner-top';
    cornerTop.innerText = label;

    const center = document.createElement('div');
    center.className = 'card-center';
    center.innerText = label;

    if (card.value === 'wild_draw4' || card.value === 'swap') {
        center.style.fontSize = card.value === 'swap' ? '32px' : '28px';
    }

    const cornerBottom = document.createElement('div');
    cornerBottom.className = 'card-corner-bottom';
    cornerBottom.innerText = label;

    cardDiv.appendChild(cornerTop);
    cardDiv.appendChild(center);
    cardDiv.appendChild(cornerBottom);

    return cardDiv;
}

socket.on('gameState', (data) => {
    const gameInfo = document.getElementById('game-info');
    if (gameInfo) {
        gameInfo.classList.remove('fade-update');
        void gameInfo.offsetWidth;
        gameInfo.classList.add('fade-update');
    }
    latestGameState = data;

    if (data.spectators && data.spectators.some(s => s.id === myId)) {
        isMeSpectator = true;
    } else {
        isMeSpectator = false;
    }

    if (isMeSpectator) {
        turnInfo.innerText = t('spectatorModeMsg');
        turnInfo.style.color = "#3498db";
        drawBtn.style.display = 'none';
    } else {
        drawBtn.style.display = 'inline-block';
        const isMyTurn = (data.currentTurnId === myId);

        if (isMyTurn) {
            if (data.pendingDrawCount > 0) {
                turnInfo.innerText = t('stackWarning', data.pendingDrawCount);
                turnInfo.style.color = "#e74c3c";
                drawBtn.innerText = t('drawNBtn', data.pendingDrawCount);
            } else {
                turnInfo.innerText = t('myTurnMsg');
                turnInfo.style.color = "#2ecc71";
                drawBtn.innerText = t('drawBtn');
            }
            drawBtn.disabled = false;
        } else {
            if (data.pendingDrawCount > 0) {
                turnInfo.innerText = t('stackingInfo', data.pendingDrawCount);
            } else {
                turnInfo.innerText = t('waitingTurn');
            }
            turnInfo.style.color = "#ecf0f1";
            drawBtn.innerText = t('drawBtn');
            drawBtn.disabled = true;
        }
    }

    playerList.innerHTML = '';
    data.players.forEach(p => {
        const li = document.createElement('li');
        li.className = 'player-card';
        if (p.id === data.currentTurnId) {
            li.classList.add('current-turn-player');
        }

        const header = document.createElement('div');
        header.className = 'player-card-header';

        const isMe = p.id === myId ? (currentLang === 'en' ? ' (You)' : ' (あなた)') : '';
        const nameSpan = document.createElement('span');
        nameSpan.innerText = `${p.name}${isMe}`;
        header.appendChild(nameSpan);

        if (p.id === data.currentTurnId) {
            const turnBadge = document.createElement('span');
            turnBadge.className = 'turn-badge';
            turnBadge.innerText = 'TURN';
            header.appendChild(turnBadge);
        }

        if (p.hasCalledUno) {
            const unoBadge = document.createElement('span');
            unoBadge.className = 'uno-status-badge';
            unoBadge.innerText = 'UNO!';
            header.appendChild(unoBadge);
        }

        li.appendChild(header);

        const miniHandDiv = document.createElement('div');
        miniHandDiv.className = 'mini-hand-container';

        const displayCardCount = Math.min(p.handCount, 10);
        for (let i = 0; i < displayCardCount; i++) {
            const miniCard = document.createElement('div');
            miniCard.className = 'mini-card-back';
            miniHandDiv.appendChild(miniCard);
        }

        const countLabel = document.createElement('span');
        countLabel.className = 'hand-count-label';
        countLabel.innerText = currentLang === 'en' ? `${p.handCount} left` : `${p.handCount}枚`;
        miniHandDiv.appendChild(countLabel);

        li.appendChild(miniHandDiv);

        if (!isMeSpectator && p.id !== myId && p.handCount === 1 && !p.hasCalledUno) {
            const reportBtn = document.createElement('button');
            reportBtn.className = 'callout-penalty-btn';
            reportBtn.style.marginLeft = '0';
            reportBtn.style.marginTop = '4px';
            reportBtn.innerText = t('reportPenaltyBtn');
            reportBtn.onclick = () => {
                socket.emit('reportUnoFailure', { roomId: currentRoomId, targetPlayerId: p.id });
            };
            li.appendChild(reportBtn);
        }

        playerList.appendChild(li);
    });

    if (data.spectators && data.spectators.length > 0) {
        const specLi = document.createElement('li');
        specLi.style.width = '100%';
        specLi.style.color = '#bdc3c7';
        specLi.style.fontSize = '13px';
        specLi.style.marginTop = '5px';
        specLi.innerText = t('spectatorsLabel', data.spectators.map(s => s.name).join(', '));
        playerList.appendChild(specLi);
    }

    if (data.topCard) {
        const topCardElement = document.getElementById('top-card');
        if (topCardElement) {
            const topColorClass = (data.topCard.value === 'wild_draw4' || data.topCard.value === 'swap') ? 'wild' : data.topCard.color;
            topCardElement.className = `card ${topColorClass} play-impact`;

            const label = getCardLabel(data.topCard);
            topCardElement.innerHTML = '';

            const cornerTop = document.createElement('div');
            cornerTop.className = 'card-corner-top';
            cornerTop.innerText = label;

            const center = document.createElement('div');
            center.className = 'card-center';
            center.innerText = label;

            if (data.topCard.color === 'wild') {
                const colorNames = currentLang === 'en' ? { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow' } : { red: '赤', blue: '青', green: '緑', yellow: '黄' };
                const designated = colorNames[data.topCard.designatedColor] || (currentLang === 'en' ? 'Red' : '赤');
                center.innerText = `${label}\n(${designated})`;
                center.style.fontSize = '16px';
            }

            const cornerBottom = document.createElement('div');
            cornerBottom.className = 'card-corner-bottom';
            cornerBottom.innerText = label;

            topCardElement.appendChild(cornerTop);
            topCardElement.appendChild(center);
            topCardElement.appendChild(cornerBottom);
        }
    }

    renderHand();
});

socket.on('yourHand', (hand) => {
    myCurrentHand = hand;
    if (!isMeSpectator && hand.length > 1) {
        hasDeclaredUnoThisTurn = false;
        unoBtn.disabled = false;
        unoBtn.innerText = "🔥 UNO!";
    }
    renderHand();
});

socket.on('announce', (msg) => {
    turnInfo.innerText = msg;
    turnInfo.style.color = "#f1c40f";
});

function renderHand() {
    handDiv.innerHTML = '';
    
    if (isMeSpectator) {
        unoBtn.style.display = 'none';
        const msg = document.createElement('p');
        msg.innerText = t('noHandSpectator');
        msg.style.color = "#bdc3c7";
        handDiv.appendChild(msg);
        return;
    }

    if (!myCurrentHand) return;

    if (myCurrentHand.length === 1) {
        unoBtn.style.display = 'inline-block';
        if (hasDeclaredUnoThisTurn) {
            unoBtn.disabled = true;
            unoBtn.innerText = t('declaredBadge');
        } else {
            unoBtn.disabled = false;
            unoBtn.innerText = "🔥 UNO!";
        }
    } else {
        unoBtn.style.display = 'none';
    }

    const isMyTurn = latestGameState && (latestGameState.currentTurnId === myId);
    const topCard = latestGameState ? latestGameState.topCard : null;
    const pendingDrawCount = latestGameState ? latestGameState.pendingDrawCount : 0;
    const isNewCardDrawn = myCurrentHand.length > previousHandLength && previousHandLength !== 0;

    myCurrentHand.forEach((card, index) => {
        const cardDiv = createCardElement(card);

        if (isNewCardDrawn && index === myCurrentHand.length - 1) {
            cardDiv.classList.add('card-draw-anim');
        }

        let isPlayable = false;
        if (isMyTurn && topCard) {
            if (pendingDrawCount > 0) {
                if (topCard.value === 'draw2') {
                    isPlayable = (card.value === 'draw2' || card.value === 'wild_draw4');
                } else if (topCard.value === 'wild_draw4') {
                    isPlayable = (card.value === 'wild_draw4');
                }
            } else {
                if (card.color === 'wild') {
                    isPlayable = true;
                } else if (topCard.color === 'wild') {
                    isPlayable = (card.color === topCard.designatedColor);
                } else {
                    const isSameColor = card.color === topCard.color;
                    const isSameValue = (card.value === topCard.value);
                    isPlayable = isSameColor || isSameValue;
                }
            }
        }

        if (!isPlayable) {
            cardDiv.classList.add('disabled');
        } else {
            // ▼ カードを高速でカーソルに吸い付かせてドラッグする処理
            cardDiv.onmousedown = (e) => {
                e.preventDefault();
                const rect = cardDiv.getBoundingClientRect();
                
                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;

                const clone = cardDiv.cloneNode(true);
                clone.style.position = 'fixed';
                clone.style.left = `${rect.left}px`;
                clone.style.top = `${rect.top}px`;
                clone.style.zIndex = '1000';
                clone.style.cursor = 'grabbing';
                clone.style.pointerEvents = 'none';
                document.body.appendChild(clone);

                cardDiv.style.opacity = '0.2';

                function onMouseMove(moveEvent) {
                    const x = moveEvent.clientX - offsetX;
                    const y = moveEvent.clientY - offsetY;
                    clone.style.left = `${x}px`;
                    clone.style.top = `${y}px`;
                    clone.style.transform = `scale(1.1)`;
                }

                function onMouseUp(upEvent) {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);

                    const discardArea = document.getElementById('discard-area');
                    const dropRect = discardArea.getBoundingClientRect();

                    const isInside = (
                        upEvent.clientX >= dropRect.left &&
                        upEvent.clientX <= dropRect.right &&
                        upEvent.clientY >= dropRect.top &&
                        upEvent.clientY <= dropRect.bottom
                    );

                    if (isInside) {
                        document.body.removeChild(clone);
                        cardDiv.style.opacity = '1';
                        playSelectedCard(card, index);
                    } else {
                        const finalRect = cardDiv.getBoundingClientRect();
                        clone.style.transition = 'transform 0.25s ease, opacity 0.25s ease, left 0.25s ease, top 0.25s ease';
                        clone.style.left = `${finalRect.left}px`;
                        clone.style.top = `${finalRect.top}px`;
                        clone.style.transform = 'scale(1)';
                        clone.style.opacity = '0.7';

                        setTimeout(() => {
                            if (document.body.contains(clone)) document.body.removeChild(clone);
                            cardDiv.style.opacity = '1';
                        }, 250);
                    }
                }

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            };

            cardDiv.onclick = () => { playSelectedCard(card, index); };
        }

        handDiv.appendChild(cardDiv);
    });

    previousHandLength = myCurrentHand.length;
}

unoBtn.onclick = () => {
    hasDeclaredUnoThisTurn = true;
    unoBtn.disabled = true;
    unoBtn.innerText = t('declaredBadge');
    socket.emit('callUno', { roomId: currentRoomId });
};

function playSelectedCard(card, index) {
    if (card.value === 'swap') {
        pendingSwapCardIndex = index;
        openSwapPlayerModal();
    } else if (card.color === 'wild') {
        pendingWildCardIndex = index;
        colorPickerModal.style.display = 'flex';
    } else {
        socket.emit('playCard', { roomId: currentRoomId, cardIndex: index });
    }
}

function openSwapPlayerModal() {
    swapPlayerButtons.innerHTML = '';
    if (!latestGameState || !latestGameState.players) return;

    latestGameState.players.forEach(p => {
        if (p.id !== myId) {
            const btn = document.createElement('button');
            btn.className = 'primary-btn';
            btn.style.padding = '10px 20px';
            btn.style.fontSize = '15px';
            btn.style.backgroundColor = '#3498db';
            btn.innerText = currentLang === 'en' ? `${p.name} (Hand: ${p.handCount})` : `${p.name} (手札: ${p.handCount}枚)`;
            btn.onclick = () => {
                selectedSwapTargetId = p.id;
                swapPlayerModal.style.display = 'none';
                pendingWildCardIndex = pendingSwapCardIndex;
                colorPickerModal.style.display = 'flex';
            };
            swapPlayerButtons.appendChild(btn);
        }
    });

    swapPlayerModal.style.display = 'flex';
}

window.selectWildColor = function(color) {
    colorPickerModal.style.display = 'none';
    
    if (pendingSwapCardIndex !== null) {
        socket.emit('playCard', { 
            roomId: currentRoomId, 
            cardIndex: pendingSwapCardIndex, 
            chosenColor: color, 
            targetPlayerId: selectedSwapTargetId 
        });
        pendingSwapCardIndex = null;
        selectedSwapTargetId = null;
    } else if (pendingWildCardIndex !== null) {
        socket.emit('playCard', { 
            roomId: currentRoomId, 
            cardIndex: pendingWildCardIndex, 
            chosenColor: color 
        });
        pendingWildCardIndex = null;
    }
};

drawBtn.onclick = () => {
    socket.emit('drawCard', { roomId: currentRoomId });
};

socket.on('gameOver', (message) => {
    const resultModal = document.getElementById('result-modal');
    const winnerText = document.getElementById('winner-text');
    
    if (resultModal && winnerText) {
        winnerText.textContent = message;
        resultModal.classList.add('show');
    } else {
        alert(message);
        location.reload();
    }
});

const restartBtn = document.getElementById('restart-btn');
if (restartBtn) {
    restartBtn.addEventListener('click', () => { location.reload(); });
}