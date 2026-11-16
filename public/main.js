const socket = io();

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

// ====================================
// ローディング制御関数
// ====================================
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

socket.on('connect', () => {
    myId = socket.id;
});

createRoomBtn.onclick = () => {
    const randomRoom = Math.floor(1000 + Math.random() * 9000).toString();
    roomIdInput.value = randomRoom;
    joinRoom();
};

joinRoomBtn.onclick = () => {
    joinRoom();
};

function joinRoom() {
    const roomId = roomIdInput.value.trim();
    const name = playerNameInput.value.trim() || 'Player';

    if (!roomId) {
        alert('ルームIDを入力してください');
        return;
    }

    const stackCheckbox = document.getElementById('stack-rule-checkbox');
    const swapCheckbox = document.getElementById('swap-rule-checkbox');
    const spectatorCheckbox = document.getElementById('spectator-rule-checkbox');
    
    const isStackEnabled = stackCheckbox ? stackCheckbox.checked : true;
    const allowSwapCard = swapCheckbox ? swapCheckbox.checked : true;
    const allowSpectator = spectatorCheckbox ? spectatorCheckbox.checked : true;

    currentRoomId = roomId;
    
    // ▼ 参加ボタンを押した瞬間にローディングを表示
    showLoading('卓を囲んでいます...');
    
    socket.emit('joinRoom', { roomId, name, isStackEnabled, allowSwapCard, allowSpectator });
}

socket.on('joinedRoom', (roomId) => {
    // ▼ 部屋に入れたらローディングを解除
    hideLoading();
    
    lobbyScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    currentRoomDisplay.innerText = `ルーム ID: ${roomId}`;
});

socket.on('unoDeclared', ({ playerId, playerName }) => {
    if (unoAnimationTimeout) {
        clearTimeout(unoAnimationTimeout);
    }

    if (playerId === myId) {
        unoScrollingText.innerText = 'UNO！';
    } else {
        unoScrollingText.innerText = `${playerName}がUNOを宣言した`;
    }

    unoOverlay.style.display = 'none';
    void unoOverlay.offsetWidth;
    unoOverlay.style.display = 'flex';

    unoAnimationTimeout = setTimeout(() => {
        unoOverlay.style.display = 'none';
    }, 2600);
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
        turnInfo.innerText = "👀 観戦モード中（試合を観戦しています）";
        turnInfo.style.color = "#3498db";
        drawBtn.style.display = 'none';
    } else {
        drawBtn.style.display = 'inline-block';
        const isMyTurn = (data.currentTurnId === myId);

        if (isMyTurn) {
            if (data.pendingDrawCount > 0) {
                turnInfo.innerText = `🔥 警告！+${data.pendingDrawCount} 累積中！カードを重ねるか、山札から ${data.pendingDrawCount}枚 引いてください`;
                turnInfo.style.color = "#e74c3c";
                drawBtn.innerText = `山札から ${data.pendingDrawCount}枚引く`;
            } else {
                turnInfo.innerText = "★ あなたの番です！出せるカードを場に出すか、山札から引いてください";
                turnInfo.style.color = "#2ecc71";
                drawBtn.innerText = "山札から引く";
            }
            drawBtn.disabled = false;
        } else {
            if (data.pendingDrawCount > 0) {
                turnInfo.innerText = `⚠️ 現在 +${data.pendingDrawCount} 累積中！次の人の運命やいかに…`;
            } else {
                turnInfo.innerText = "相手のターンを待っています...";
            }
            turnInfo.style.color = "#ecf0f1";
            drawBtn.innerText = "山札から引く";
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

        const isMe = p.id === myId ? ' (あなた)' : '';
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
        countLabel.innerText = `${p.handCount}枚`;
        miniHandDiv.appendChild(countLabel);

        li.appendChild(miniHandDiv);

        if (!isMeSpectator && p.id !== myId && p.handCount === 1 && !p.hasCalledUno) {
            const reportBtn = document.createElement('button');
            reportBtn.className = 'callout-penalty-btn';
            reportBtn.style.marginLeft = '0';
            reportBtn.style.marginTop = '4px';
            reportBtn.innerText = '⚠️ UNO言い忘れ指摘！';
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
        specLi.innerText = `👀 観戦者: ${data.spectators.map(s => s.name).join(', ')}`;
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
                const colorNames = { red: '赤', blue: '青', green: '緑', yellow: '黄' };
                const designated = colorNames[data.topCard.designatedColor] || '赤';
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
        msg.innerText = "※あなたは現在観戦中です（手札はありません）";
        msg.style.color = "#bdc3c7";
        handDiv.appendChild(msg);
        return;
    }

    if (!myCurrentHand) return;

    if (myCurrentHand.length === 1) {
        unoBtn.style.display = 'inline-block';
        if (hasDeclaredUnoThisTurn) {
            unoBtn.disabled = true;
            unoBtn.innerText = "✔ 宣言済み！";
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
            cardDiv.onmousedown = (e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const rect = cardDiv.getBoundingClientRect();
                
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
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;
                    clone.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
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
                        const returnDx = finalRect.left - rect.left;
                        const returnDy = finalRect.top - rect.top;

                        clone.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
                        clone.style.transform = `translate(${returnDx}px, ${returnDy}px) scale(1)`;
                        clone.style.opacity = '0.7';

                        setTimeout(() => {
                            if (document.body.contains(clone)) {
                                document.body.removeChild(clone);
                            }
                            cardDiv.style.opacity = '1';
                        }, 250);
                    }
                }

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            };

            cardDiv.onclick = () => {
                playSelectedCard(card, index);
            };
        }

        handDiv.appendChild(cardDiv);
    });

    previousHandLength = myCurrentHand.length;
}

unoBtn.onclick = () => {
    hasDeclaredUnoThisTurn = true;
    unoBtn.disabled = true;
    unoBtn.innerText = "✔ 宣言済み！";
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
            btn.innerText = `${p.name} (手札: ${p.handCount}枚)`;
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
    restartBtn.addEventListener('click', () => {
        location.reload();
    });
}