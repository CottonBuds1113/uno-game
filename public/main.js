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

let myId = '';
let currentRoomId = '';
let latestGameState = null;
let myCurrentHand = [];
let previousHandLength = 0;
let pendingWildCardIndex = null;
let hasDeclaredUnoThisTurn = false;

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

    currentRoomId = roomId;
    socket.emit('joinRoom', { roomId, name });
}

socket.on('joinedRoom', (roomId) => {
    lobbyScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    currentRoomDisplay.innerText = `ルーム ID: ${roomId}`;
});

function getCardLabel(card) {
    if (!card) return '';
    if (card.type === 'number') return card.value;
    if (card.value === 'skip') return '🚫';
    if (card.value === 'reverse') return '🔄';
    if (card.value === 'draw2') return '+2';
    if (card.value === 'wild') return '🌈';
    return card.value;
}

function createCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = `card ${card.color}`;

    const label = getCardLabel(card);

    const cornerTop = document.createElement('div');
    cornerTop.className = 'card-corner-top';
    cornerTop.innerText = label;

    const center = document.createElement('div');
    center.className = 'card-center';
    center.innerText = label;

    const cornerBottom = document.createElement('div');
    cornerBottom.className = 'card-corner-bottom';
    cornerBottom.innerText = label;

    cardDiv.appendChild(cornerTop);
    cardDiv.appendChild(center);
    cardDiv.appendChild(cornerBottom);

    return cardDiv;
}

socket.on('gameState', (data) => {
    latestGameState = data;
    const isMyTurn = (data.currentTurnId === myId);

    if (isMyTurn) {
        if (data.pendingDrawCount > 0) {
            turnInfo.innerText = `🔥 警告！+${data.pendingDrawCount} 累積中！+2カードを重ねるか、山札から ${data.pendingDrawCount}枚 引いてください`;
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

    playerList.innerHTML = '';
    data.players.forEach(p => {
        const li = document.createElement('li');
        const isMe = p.id === myId ? ' (あなた)' : '';
        const unoStatus = p.hasCalledUno ? ' 「🔥UNO!」' : '';
        li.innerText = `${p.name}${isMe}：手札 ${p.handCount}枚${unoStatus}`;
        
        if (p.id === data.currentTurnId) {
            li.classList.add('current-turn-player');
            li.innerText += ' 👈 [ターン]';
        }

        if (p.id !== myId && p.handCount === 1 && !p.hasCalledUno) {
            const reportBtn = document.createElement('button');
            reportBtn.className = 'callout-penalty-btn';
            reportBtn.innerText = 'UNO言い忘れ指摘！';
            reportBtn.onclick = () => {
                socket.emit('reportUnoFailure', { roomId: currentRoomId, targetPlayerId: p.id });
            };
            li.appendChild(reportBtn);
        }

        playerList.appendChild(li);
    });

    if (data.topCard) {
        const topCardElement = document.getElementById('top-card');
        if (topCardElement) {
            topCardElement.className = `card ${data.topCard.color} play-impact`;

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
                center.innerText = `🌈\n(${designated})`;
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
    if (hand.length > 1) {
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
                // 累積中は「同じdraw2」だけが出せる
                isPlayable = (topCard.value === 'draw2' && card.value === 'draw2');
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
    if (card.color === 'wild') {
        pendingWildCardIndex = index;
        colorPickerModal.style.display = 'flex';
    } else {
        socket.emit('playCard', { roomId: currentRoomId, cardIndex: index });
    }
}

window.selectWildColor = function(color) {
    colorPickerModal.style.display = 'none';
    if (pendingWildCardIndex !== null) {
        socket.emit('playCard', { roomId: currentRoomId, cardIndex: pendingWildCardIndex, chosenColor: color });
        pendingWildCardIndex = null;
    }
};

drawBtn.onclick = () => {
    socket.emit('drawCard', { roomId: currentRoomId });
};

socket.on('gameOver', (message) => {
    alert(message);
    location.reload();
});