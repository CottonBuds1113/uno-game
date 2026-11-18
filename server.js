const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

function createDeck(allowSwapCard = true) {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    let deck = [];

    for (let color of colors) {
        for (let num of numbers) {
            deck.push({ color, type: 'number', value: num, id: `${color}-${num}-${Math.random()}` });
            if (num !== 0) {
                deck.push({ color, type: 'number', value: num, id: `${color}-${num}-${Math.random()}-2` });
            }
        }
        const actions = ['skip', 'reverse', 'draw2'];
        for (let action of actions) {
            deck.push({ color, type: 'action', value: action, id: `${color}-${action}-${Math.random()}` });
            deck.push({ color, type: 'action', value: action, id: `${color}-${action}-${Math.random()}-2` });
        }
    }

    for (let i = 0; i < 4; i++) {
        deck.push({ color: 'wild', type: 'wild', value: 'wild', id: `wild-${Math.random()}` });
    }

    for (let i = 0; i < 4; i++) {
        deck.push({ color: 'wild', type: 'wild_draw4', value: 'wild_draw4', id: `wild_draw4-${Math.random()}` });
    }

    if (allowSwapCard) {
        for (let i = 0; i < 4; i++) {
            deck.push({ color: 'wild', type: 'swap', value: 'swap', id: `swap-${Math.random()}` });
        }
    }

    return deck.sort(() => Math.random() - 0.5);
}

const rooms = {};

function getOrCreateRoom(roomId, isStackEnabled = true, allowSwapCard = true, allowSpectator = true, isSameCardStackEnabled = true) {
    if (!rooms[roomId]) {
        const deck = createDeck(allowSwapCard);
        let topCard = deck.pop();
        while (topCard.type !== 'number') {
            deck.unshift(topCard);
            topCard = deck.pop();
        }

        rooms[roomId] = {
            deck: deck,
            discardPile: [topCard],
            players: [],
            spectators: [],
            turn: 0,
            direction: 1,
            pendingDrawCount: 0,
            isStackEnabled: isStackEnabled,
            allowSwapCard: allowSwapCard,
            allowSpectator: allowSpectator,
            isSameCardStackEnabled: isSameCardStackEnabled
        };
    }
    return rooms[roomId];
}

function updateGameState(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    if (room.players.length > 0) {
        room.turn = (room.turn + room.players.length) % room.players.length;
    } else {
        room.turn = 0;
    }

    io.to(roomId).emit('gameState', {
        players: room.players.map(p => ({ 
            id: p.id, 
            name: p.name, 
            handCount: p.hand.length,
            hasCalledUno: p.hasCalledUno 
        })),
        spectators: room.spectators.map(s => ({
            id: s.id,
            name: s.name
        })),
        topCard: room.discardPile[room.discardPile.length - 1],
        currentTurnId: room.players[room.turn] ? room.players[room.turn].id : null,
        pendingDrawCount: room.pendingDrawCount,
        isSameCardStackEnabled: room.isSameCardStackEnabled
    });

    room.players.forEach(p => {
        io.to(p.id).emit('yourHand', p.hand);
    });

    room.spectators.forEach(s => {
        io.to(s.id).emit('yourHand', []);
    });
}

io.on('connection', (socket) => {
    let playerRoomId = null;

    socket.on('joinRoom', ({ roomId, name, isStackEnabled, allowSwapCard, allowSpectator, isSameCardStackEnabled }) => {
        playerRoomId = roomId;
        socket.join(roomId);

        const room = getOrCreateRoom(roomId, isStackEnabled, allowSwapCard, allowSpectator, isSameCardStackEnabled);
        room.allowSpectator = allowSpectator;

        if (room.players.length > 0 && room.allowSpectator) {
            const spectator = {
                id: socket.id,
                name: name || `Spectator ${room.spectators.length + 1}`,
                isSpectator: true
            };
            room.spectators.push(spectator);

            socket.emit('joinedRoom', roomId);
            updateGameState(roomId);
            return;
        }

        if (room.deck.length < 7) {
            room.deck = createDeck(room.allowSwapCard);
        }

        const playerHand = room.deck.splice(0, 7);
        const player = {
            id: socket.id,
            name: name || `Player ${room.players.length + 1}`,
            hand: playerHand,
            hasCalledUno: false,
            isSpectator: false
        };
        room.players.push(player);

        socket.emit('joinedRoom', roomId);
        updateGameState(roomId);
    });

    socket.on('callUno', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (player && player.hand.length === 1 && !player.hasCalledUno) {
            player.hasCalledUno = true;
            io.to(roomId).emit('unoDeclared', {
                playerId: player.id,
                playerName: player.name
            });
            updateGameState(roomId);
        }
    });

    socket.on('reportUnoFailure', ({ roomId, targetPlayerId }) => {
        const room = rooms[roomId];
        if (!room) return;
        const targetPlayer = room.players.find(p => p.id === targetPlayerId);
        
        if (targetPlayer && targetPlayer.hand.length === 1 && !targetPlayer.hasCalledUno) {
            for (let i = 0; i < 2; i++) {
                if (room.deck.length === 0) room.deck = createDeck(room.allowSwapCard);
                targetPlayer.hand.push(room.deck.pop());
            }
            targetPlayer.hasCalledUno = false;
            io.to(roomId).emit('announce', `⚠️ ${targetPlayer.name} はUNO宣言を忘れていたためペナルティ！(2枚ドロー)`);
            updateGameState(roomId);
        }
    });

    // ▼ 【新規対応】 複数枚同時出し（playCards）の処理
    socket.on('playCards', ({ roomId, cardIndices, chosenColor, targetPlayerId }) => {
        const room = rooms[roomId];
        if (!room || room.players.length === 0) return;
        if (!room.players[room.turn] || room.players[room.turn].id !== socket.id) return;
        if (!cardIndices || cardIndices.length === 0) return;

        const player = room.players[room.turn];

        // インデックスの妥当性＆重複チェック
        const sortedIndices = [...cardIndices].sort((a, b) => b - a); // 降順にして後ろから安全にスプライスする
        for (let idx of sortedIndices) {
            if (idx < 0 || idx >= player.hand.length) return;
        }

        // 選択されたカードオブジェクトの抽出
        const cardsToPlay = sortedIndices.map(idx => player.hand[idx]);
        const topCard = room.discardPile[room.discardPile.length - 1];

        // 1枚目のカードが場に出せるか判定
        const firstCard = cardsToPlay[cardsToPlay.length - 1]; // 元のインデックス順の先頭

        if (room.isStackEnabled && room.pendingDrawCount > 0) {
            if (topCard.value === 'draw2') {
                const isCanStack = (firstCard.value === 'draw2' || firstCard.value === 'wild_draw4');
                if (!isCanStack) return;
            } else if (topCard.value === 'wild_draw4') {
                const isCanStack = (firstCard.value === 'wild_draw4');
                if (!isCanStack) return;
            }
        }

        let isPlayable = false;
        if (firstCard.color === 'wild') {
            isPlayable = true;
        } else if (topCard.color === 'wild') {
            isPlayable = (firstCard.color === topCard.designatedColor);
        } else {
            const isSameColor = firstCard.color === topCard.color;
            const isSameValue = (firstCard.value === topCard.value);
            isPlayable = isSameColor || isSameValue;
        }

        if (!isPlayable) return;

        // 2枚目以降がすべて「同じ数字・記号」かチェック（重ね出しルール有効時）
        if (cardsToPlay.length > 1) {
            if (!room.isSameCardStackEnabled) return;
            const baseVal = firstCard.value;
            for (let c of cardsToPlay) {
                if (c.value !== baseVal) return;
            }
        }

        // 手札からカードを削除して場に出す
        let playedCards = [];
        for (let idx of sortedIndices) {
            playedCards.unshift(player.hand.splice(idx, 1)[0]);
        }

        // 最後のカード（またはワイルド）に対して指定色や特殊効果を適用
        const lastPlayedCard = playedCards[playedCards.length - 1];
        if (lastPlayedCard.color === 'wild') {
            lastPlayedCard.designatedColor = chosenColor || 'red';
        }

        // スワップカードが含まれていた場合（先頭のカードがスワップの場合など）
        if (lastPlayedCard.value === 'swap' && targetPlayerId) {
            const targetPlayer = room.players.find(p => p.id === targetPlayerId);
            if (targetPlayer) {
                const tempHand = player.hand;
                player.hand = targetPlayer.hand;
                targetPlayer.hand = tempHand;
                io.to(roomId).emit('announce', `🔄 ${player.name} が ${targetPlayer.name} と手札を交換しました！`);
            }
        }

        // 捨札の山に追加
        room.discardPile.push(...playedCards);

        if (player.hand.length > 1) {
            player.hasCalledUno = false;
        }

        if (player.hand.length === 0) {
            io.to(roomId).emit('gameOver', `${player.name} の勝利です！`);
            delete rooms[roomId];
            return;
        }

        // 特殊効果の重ねがけ処理
        let skipCount = 0;
        let totalDraw2 = 0;
        let totalDraw4 = 0;

        playedCards.forEach(c => {
            if (c.value === 'skip') {
                skipCount += 1;
            } else if (c.value === 'reverse') {
                room.direction *= -1;
                if (room.players.length === 2) skipCount += 1;
            } else if (c.value === 'draw2') {
                if (room.isStackEnabled) {
                    room.pendingDrawCount += 2;
                } else {
                    totalDraw2 += 2;
                }
            } else if (c.value === 'wild_draw4') {
                if (room.isStackEnabled) {
                    room.pendingDrawCount += 4;
                } else {
                    totalDraw4 += 4;
                }
            }
        });

        // スタックOFF時のドロー処理（合算枚数分を次プレイヤーに引かせる）
        if (!room.isStackEnabled && (totalDraw2 > 0 || totalDraw4 > 0)) {
            const nextTurnIndex = (room.turn + room.direction + room.players.length) % room.players.length;
            const nextPlayer = room.players[nextTurnIndex];
            const drawTotal = totalDraw2 + totalDraw4;
            for (let i = 0; i < drawTotal; i++) {
                if (room.deck.length === 0) room.deck = createDeck(room.allowSwapCard);
                nextPlayer.hand.push(room.deck.pop());
            }
            nextPlayer.hasCalledUno = false;
            skipCount += 1;
        }

        // ターン進行 ＋ スキップ回数分の加算
        room.turn += room.direction * (1 + skipCount);

        updateGameState(roomId);
    });

    socket.on('drawCard', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.players.length === 0) return;
        if (!room.players[room.turn] || room.players[room.turn].id !== socket.id) return;

        const player = room.players[room.turn];

        if (room.isStackEnabled && room.pendingDrawCount > 0) {
            for (let i = 0; i < room.pendingDrawCount; i++) {
                if (room.deck.length === 0) room.deck = createDeck(room.allowSwapCard);
                player.hand.push(room.deck.pop());
            }
            io.to(roomId).emit('announce', `💥 ${player.name} は累積ペナルティで ${room.pendingDrawCount}枚 引かされました！`);
            room.pendingDrawCount = 0;
        } else {
            if (room.deck.length === 0) room.deck = createDeck(room.allowSwapCard);
            player.hand.push(room.deck.pop());
            player.hasCalledUno = false;
        }

        room.turn += room.direction;
        updateGameState(roomId);
    });

    socket.on('disconnect', () => {
        if (!playerRoomId || !rooms[playerRoomId]) return;
        const room = rooms[playerRoomId];
        
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
        } else {
            const specIndex = room.spectators.findIndex(s => s.id === socket.id);
            if (specIndex !== -1) room.spectators.splice(specIndex, 1);
        }

        if (room.players.length === 0 && room.spectators.length === 0) {
            delete rooms[playerRoomId];
        } else {
            if (room.players.length > 0) {
                if (room.turn >= room.players.length) room.turn = 0;
                updateGameState(playerRoomId);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server runs on port ${PORT}`);
});