const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const CONSTANTS = {
    PLAYER_ID: 'player',
    CPU_ID: 'cpu',
    REVEAL_DURATION: 3000,
    TURN_DELAY: 1000,
    CPU_THINK_TIME: 1500,
    EFFECT_SOURCE: { EMPEROR: 'emperor', REVOLUTION: 'revolution', EFFECT: 'effect' },
    CARD_NUMBERS: { BOY: 1, SOLDIER: 2, FORTUNE_TELLER: 3, MAIDEN: 4, REAPER: 5,
        NOBLE: 6, SAGE: 7, SPIRIT: 8, EMPEROR: 9, HERO: 10 },
};

// Part 1-1: デッキ構成の完全な修正
const CARD_DATA = {
    [CONSTANTS.CARD_NUMBERS.BOY]: { name: '少年', count: 2 },
    [CONSTANTS.CARD_NUMBERS.SOLDIER]: { name: '兵士', count: 2 },
    [CONSTANTS.CARD_NUMBERS.FORTUNE_TELLER]: { name: '占師', count: 2 },
    [CONSTANTS.CARD_NUMBERS.MAIDEN]: { name: '乙女', count: 2 },
    [CONSTANTS.CARD_NUMBERS.REAPER]: { name: '死神', count: 2 },
    [CONSTANTS.CARD_NUMBERS.NOBLE]: { name: '貴族', count: 2 },
    [CONSTANTS.CARD_NUMBERS.SAGE]: { name: '賢者', count: 2 },
    [CONSTANTS.CARD_NUMBERS.SPIRIT]: { name: '精霊', count: 2 },
    [CONSTANTS.CARD_NUMBERS.EMPEROR]: { name: '皇帝', count: 1 },
    [CONSTANTS.CARD_NUMBERS.HERO]: { name: '英雄', count: 1 },
};

class Game {
    constructor() {
        this.ui = this.getUIReferences();
        this.state = {};
        this.bindEventListeners();
        this.initGame();
    }

    getUIReferences() {
        return {
            deckCount: document.getElementById('deck-count').querySelector('span'),
            log: document.getElementById('message-log'),
            reincarnationCard: document.getElementById('reincarnation-card'),
            player: {
                area: document.getElementById('player-area'),
                hand: document.getElementById('player-hand'),
                discard: document.getElementById('player-discard'),
                status: document.getElementById('player-status'),
            },
            cpu: {
                area: document.getElementById('cpu-area'),
                hand: document.getElementById('cpu-hand'),
                discard: document.getElementById('cpu-discard'),
                status: document.getElementById('cpu-status'),
            },
            modals: {
                gameOver: document.getElementById('game-over-modal'),
                gameOverTitle: document.getElementById('game-over-title'),
                gameOverDesc: document.getElementById('game-over-desc'),
                restartButton: document.getElementById('restart-button'),
                action: document.getElementById('action-modal'),
                actionTitle: document.getElementById('action-title'),
                actionDesc: document.getElementById('action-desc'),
                actionChoices: document.getElementById('action-choices'),
                info: document.getElementById('info-modal'),
                infoBody: document.getElementById('info-body'),
                infoBackButton: document.getElementById('info-back-button'),
                rule: document.getElementById('rule-modal'),
                ruleButton: document.getElementById('rule-button'),
                ruleCloseButton: document.getElementById('rule-close-button'),
            }
        };
    }
    
    bindEventListeners() {
        this.ui.modals.restartButton.addEventListener('click', () => this.initGame());
        this.ui.modals.infoBackButton.addEventListener('click', () => this.handleInfoBackClick());
        this.ui.modals.ruleButton.addEventListener('click', () => this.ui.modals.rule.style.display = 'flex');
        this.ui.modals.ruleCloseButton.addEventListener('click', () => this.ui.modals.rule.style.display = 'none');
    }

    initGame() {
        this.state = {
            deck: [],
            reincarnationCard: null,
            [CONSTANTS.PLAYER_ID]: { id: CONSTANTS.PLAYER_ID, name: 'あなた', hand: [], discard: [], isProtected: false, isOut: false, hasSageEffect: false },
            [CONSTANTS.CPU_ID]: { id: CONSTANTS.CPU_ID, name: 'CPU', hand: [], discard: [], isProtected: false, isOut: false, hasSageEffect: false },
            turn: CONSTANTS.PLAYER_ID, gameOver: false, isEffectActive: false,
        };
        
        // Part 1-2: 「転生札」システムの導入
        let fullDeck = [];
        for (const number in CARD_DATA) {
            for (let i = 0; i < CARD_DATA[number].count; i++) {
                fullDeck.push({ number: parseInt(number), name: CARD_DATA[number].name });
            }
        }
        
        this.shuffle(fullDeck);
        this.state.reincarnationCard = fullDeck.pop();
        this.state.deck = fullDeck; // Remaining 17 cards become the deck
        
        this.drawCard(CONSTANTS.PLAYER_ID);
        this.drawCard(CONSTANTS.CPU_ID);
        this.logMessage('ゲームを開始します。');
        this.ui.modals.gameOver.style.display = 'none';
        setTimeout(() => this.updateUI(), 0);
        this.startTurn();
    }

    updateUI() {
        const updatePlayerArea = (playerId) => {
            const playerState = this.state[playerId];
            const playerUI = this.ui[playerId];
            playerUI.hand.innerHTML = '';
            playerState.hand.forEach((card, index) => playerUI.hand.appendChild(this.createCardElement(card, playerId, index)));
            playerUI.discard.innerHTML = '';
            playerState.discard.forEach(card => playerUI.discard.appendChild(this.createCardElement(card, 'discard')));
            playerUI.area.classList.toggle('player-area--is-turn', this.state.turn === playerId && !this.state.gameOver);
            playerUI.area.classList.toggle('player-area--is-protected', playerState.isProtected);
            playerUI.status.textContent = playerState.isProtected ? '🛡️' : '';
        };
        updatePlayerArea(CONSTANTS.PLAYER_ID);
        updatePlayerArea(CONSTANTS.CPU_ID);
        this.ui.deckCount.textContent = this.state.deck.length;
        this.ui.reincarnationCard.style.display = this.state.reincarnationCard ? 'flex' : 'none';
    }
    
    createCardElement(card, owner, cardIndex = -1) {
        const el = document.createElement('div');
        el.classList.add('card');
        const isCpuCard = owner === CONSTANTS.CPU_ID;
        const isRevealed = card.isRevealed || (owner === CONSTANTS.PLAYER_ID) || this.state.gameOver;
        if (isCpuCard && !isRevealed) {
            el.classList.add('card--is-back');
        } else {
            el.innerHTML = `
                <div class="card__number">${card.number}</div>
                <div class="card__name">${card.name}</div>
                <div class="card__number card__number--bottom">${card.number}</div>`;
        }
        const isPlayable = owner === CONSTANTS.PLAYER_ID && this.state.turn === CONSTANTS.PLAYER_ID && this.state.player.hand.length === 2 && !this.state.isEffectActive;
        if (isPlayable) {
            el.classList.add('card--is-playable');
            el.addEventListener('click', () => this.playCard(CONSTANTS.PLAYER_ID, card, cardIndex));
        }
        return el;
    }

    logMessage(msg) {
        const p = document.createElement('p');
        p.textContent = msg;
        this.ui.log.prepend(p);
    }

    async startTurn() {
        if (this.state.gameOver) return;
        const currentPlayerId = this.state.turn;
        const currentPlayer = this.state[currentPlayerId];
        this.logMessage(`--- ${currentPlayer.name}のターン ---`);
        currentPlayer.isProtected = false;
        if (currentPlayer.hasSageEffect) {
            currentPlayer.hasSageEffect = false;
            this.logMessage(`${currentPlayer.name}は「賢者」の効果を発動！`);
            const drawnCards = [];
            const drawCount = Math.min(3, this.state.deck.length);
            if (drawCount > 0) {
                for (let i = 0; i < drawCount; i++) drawnCards.push(this.state.deck.pop());
                const chosenCard = await this.promptForChoice({
                    playerId: currentPlayerId, type: 'card', title: '賢者の効果',
                    description: '手札に加えるカードを1枚選んでください。', options: drawnCards
                });
                currentPlayer.hand.push(chosenCard);
                const returnedCards = drawnCards.filter(c => c !== chosenCard);
                if (returnedCards.length > 0) {
                    this.state.deck.push(...returnedCards);
                    this.shuffle(this.state.deck);
                }
                this.logMessage(`${currentPlayer.name}はカードを1枚選び、残りを山札に戻した。`);
            } else {
                this.logMessage('しかし山札にカードがなかった。');
            }
        } else {
            if (!this.drawCard(currentPlayerId)) {
                this.endGame(this.checkWinCondition());
                return;
            }
        }
        this.updateUI();
        if (currentPlayerId === CONSTANTS.CPU_ID) {
            await sleep(CONSTANTS.CPU_THINK_TIME);
            this.cpuTurn();
        }
    }
    
    async endTurn() {
        if (this.state.gameOver) return;
        const winner = this.checkWinCondition();
        if (winner) { this.endGame(winner); return; }
        this.state.turn = this.getOpponentId(this.state.turn);
        await sleep(CONSTANTS.TURN_DELAY);
        this.startTurn();
    }

    async playCard(playerId, card, cardIndex) {
        if (card.number === CONSTANTS.CARD_NUMBERS.HERO) {
            this.logMessage('「英雄」は手札からプレイできません。');
            return;
        }
        const player = this.state[playerId];
        if (this.state.turn !== playerId || player.hand.length < 2 || this.state.isEffectActive) return;
        this.state.isEffectActive = true;
        player.hand.splice(cardIndex, 1);
        player.discard.push(card);
        this.logMessage(`${player.name}は「${card.name}」をプレイ。`);
        this.updateUI();
        const effectHandler = this.CARD_EFFECTS[card.number];
        if (effectHandler) await effectHandler.call(this, playerId);
        this.state.isEffectActive = false;
        this.endTurn();
    }
    
    // Part 2: 乙女の守護効果のバグ修正
    isProtected(playerId) {
        const player = this.state[playerId];
        if (player.isProtected) {
            this.logMessage(`しかし、${player.name}は「乙女」の効果で守られている！`);
            return true;
        }
        return false;
    }

    CARD_EFFECTS = {
        async [CONSTANTS.CARD_NUMBERS.BOY](playerId) {
            const allDiscards = [...this.state.player.discard, ...this.state.cpu.discard];
            const boyCount = allDiscards.filter(c => c.number === CONSTANTS.CARD_NUMBERS.BOY).length;
            if (boyCount === 2) {
                await this.executeRevolution(playerId);
            } else {
                this.logMessage('「少年」の効果。何も起こらない。');
            }
            await sleep(CONSTANTS.TURN_DELAY);
        },
        async [CONSTANTS.CARD_NUMBERS.SOLDIER](playerId) {
            const opponent = this.state[this.getOpponentId(playerId)];
            if (this.isProtected(this.getOpponentId(playerId))) return await sleep(CONSTANTS.TURN_DELAY);
            const guess = await this.promptForChoice({
                playerId, type: 'button', title: '推測',
                description: '相手の手札の役職を推測してください。', options: [1, 3, 4, 5, 6, 7, 8, 9, 10],
                showInfoButton: true,
            });
            if (guess === null) return;
            this.logMessage(`${this.state[playerId].name}は「${CARD_DATA[guess].name}」と推測。`);
            if (opponent.hand[0]?.number === guess) {
                this.logMessage(`的中！ ${opponent.name}は脱落。`);
                opponent.isOut = true;
            } else { this.logMessage('しかし、推測は外れた。'); }
            await sleep(CONSTANTS.TURN_DELAY);
        },
        async [CONSTANTS.CARD_NUMBERS.FORTUNE_TELLER](playerId) {
             const opponentId = this.getOpponentId(playerId);
             if (this.isProtected(opponentId)) return await sleep(CONSTANTS.TURN_DELAY);
             const opponent = this.state[opponentId];
             if (opponent.hand.length === 0) this.logMessage('相手の手札がありません。');
             else {
                this.logMessage(`${this.state[playerId].name}は相手の手札を見た。`);
                if (playerId === CONSTANTS.PLAYER_ID) await this.revealCard(opponentId, 0, CONSTANTS.REVEAL_DURATION);
             }
             await sleep(CONSTANTS.TURN_DELAY);
        },
        async [CONSTANTS.CARD_NUMBERS.MAIDEN](playerId) {
            this.logMessage(`${this.state[playerId].name}は次のターンまで守護状態に。`);
            this.state[playerId].isProtected = true;
            this.updateUI();
            await sleep(CONSTANTS.TURN_DELAY);
        },
        async [CONSTANTS.CARD_NUMBERS.REAPER](playerId) {
            const opponentId = this.getOpponentId(playerId);
            if (this.isProtected(opponentId)) return await sleep(CONSTANTS.TURN_DELAY);
            const opponent = this.state[opponentId];
            this.logMessage(`${opponent.name}は山札から1枚引く。`);
            this.drawCard(opponentId);
            this.updateUI();
            await sleep(CONSTANTS.TURN_DELAY);
            if (opponent.hand.length > 0) {
                const discardIndex = Math.floor(Math.random() * opponent.hand.length);
                this.logMessage(`2枚の手札からランダムに1枚が捨てられる...`);
                await sleep(CONSTANTS.TURN_DELAY);
                this.discardCard(opponentId, discardIndex);
            } else this.logMessage(`しかし相手の手札がなかった。`);
            if (this.state.gameOver) this.endGame(this.checkWinCondition());
            await sleep(CONSTANTS.TURN_DELAY);
        },
        async [CONSTANTS.CARD_NUMBERS.NOBLE](playerId) {
            const opponentId = this.getOpponentId(playerId);
            const allDiscards = [...this.state.player.discard, ...this.state.cpu.discard];
            const nobleCount = allDiscards.filter(c => c.number === CONSTANTS.CARD_NUMBERS.NOBLE).length;
            if (this.isProtected(opponentId)) return await sleep(CONSTANTS.TURN_DELAY);
            if (nobleCount === 1) {
                 this.logMessage('1枚目の「貴族」。お互いの手札を見せ合う。');
                 await Promise.all([ this.revealCard(playerId, 0, CONSTANTS.REVEAL_DURATION), this.revealCard(opponentId, 0, CONSTANTS.REVEAL_DURATION) ]);
            } else {
                this.logMessage('2枚目の「貴族」！対決だ！');
                const player = this.state[playerId];
                const opponent = this.state[opponentId];
                if(player.hand.length === 0 || opponent.hand.length === 0) { this.logMessage('しかし、どちらかの手札がなかった。'); return; }
                await Promise.all([ this.revealCard(playerId, 0, CONSTANTS.REVEAL_DURATION), this.revealCard(opponentId, 0, CONSTANTS.REVEAL_DURATION) ]);
                const pCard = player.hand[0].number;
                const oCard = opponent.hand[0].number;
                if (pCard > oCard) { this.logMessage(`${player.name}の勝利！ ${opponent.name}は脱落。`); opponent.isOut = true; }
                else if (oCard > pCard) { this.logMessage(`${opponent.name}の勝利！ ${player.name}は脱落。`); player.isOut = true; }
                else this.logMessage('引き分けだ。');
            }
            await sleep(CONSTANTS.TURN_DELAY);
        },
        async [CONSTANTS.CARD_NUMBERS.SAGE](playerId) {
            this.logMessage('「賢者」の効果。次のターン、山札から3枚引く。');
            this.state[playerId].hasSageEffect = true;
            await sleep(CONSTANTS.TURN_DELAY);
        },
        async [CONSTANTS.CARD_NUMBERS.SPIRIT](playerId) {
            const opponentId = this.getOpponentId(playerId);
            if (this.isProtected(opponentId)) return await sleep(CONSTANTS.TURN_DELAY);
            const player = this.state[playerId];
            const opponent = this.state[opponentId];
            if(player.hand.length === 0 || opponent.hand.length === 0) { this.logMessage('どちらかの手札がありません。'); return; }
            this.logMessage(`${player.name}は${opponent.name}と手札を交換！`);
            [player.hand[0], opponent.hand[0]] = [opponent.hand[0], player.hand[0]];
            this.updateUI();
            await sleep(CONSTANTS.TURN_DELAY);
        },
        async [CONSTANTS.CARD_NUMBERS.EMPEROR](playerId) {
            const opponentId = this.getOpponentId(playerId);
            if (this.isProtected(opponentId)) return await sleep(CONSTANTS.TURN_DELAY);
            const opponent = this.state[opponentId];
            this.logMessage(`${opponent.name}は山札から1枚引く。`);
            this.drawCard(opponentId);
            this.updateUI();
            await sleep(CONSTANTS.TURN_DELAY);
            if(opponent.hand.length === 0) { this.logMessage('しかし相手の手札がなかった。'); return; }
            this.logMessage(`${this.state[playerId].name}は${opponent.name}の手札を公開させ、1枚選んで捨てさせる！`);
            await Promise.all(opponent.hand.map((_, index) => this.revealCard(opponentId, index, CONSTANTS.REVEAL_DURATION)));
            const cardToDiscard = await this.promptForChoice({
                playerId, type: 'card', title: '皇帝の効果',
                description: '捨てさせるカードを1枚選んでください。', options: opponent.hand
            });
            const cardIndexToDiscard = opponent.hand.findIndex(c => c === cardToDiscard);
            this.discardCard(opponentId, cardIndexToDiscard, CONSTANTS.EFFECT_SOURCE.EMPEROR);
            if(this.state.gameOver) this.endGame(this.checkWinCondition());
            await sleep(CONSTANTS.TURN_DELAY);
        },
    };

    async executeRevolution(playerId) {
        const opponentId = this.getOpponentId(playerId);
        if (this.isProtected(opponentId)) return await sleep(CONSTANTS.TURN_DELAY);
        const opponent = this.state[opponentId];
        this.logMessage(`${opponent.name}は山札から1枚引く。`);
        this.drawCard(opponentId);
        this.updateUI();
        await sleep(CONSTANTS.TURN_DELAY);
        if (opponent.hand.length === 0) { this.logMessage('しかし相手の手札がなかった。'); await sleep(CONSTANTS.TURN_DELAY); return; }
        this.logMessage(`${this.state[playerId].name}は${opponent.name}の手札を公開させ、1枚選んで捨てさせる！`);
        await Promise.all(opponent.hand.map((_, index) => this.revealCard(opponentId, index, CONSTANTS.REVEAL_DURATION)));
        const cardToDiscard = await this.promptForChoice({
            playerId, type: 'card', title: '革命の効果',
            description: '捨てさせるカードを1枚選んでください。', options: opponent.hand
        });
        const cardIndexToDiscard = opponent.hand.findIndex(c => c === cardToDiscard);
        this.discardCard(opponentId, cardIndexToDiscard, CONSTANTS.EFFECT_SOURCE.REVOLUTION);
        if (this.state.gameOver) this.endGame(this.checkWinCondition());
        await sleep(CONSTANTS.TURN_DELAY);
    }

    cpuTurn() {
        const hand = this.state.cpu.hand;
        if (hand.length < 2) { this.endTurn(); return; }
        const playableHand = hand.map((card, index) => ({ card, index })).filter(item => item.card.number !== CONSTANTS.CARD_NUMBERS.HERO);
        if (playableHand.length === 0) { this.logMessage('CPUはプレイできるカードがありません。'); this.endTurn(); return; }
        const sageInHand = playableHand.find(item => item.card.number === CONSTANTS.CARD_NUMBERS.SAGE);
        const choice = sageInHand || playableHand.sort((a,b) => a.card.number - b.card.number)[0];
        this.playCard(CONSTANTS.CPU_ID, choice.card, choice.index);
    }

    getOpponentId(playerId) {
        return playerId === CONSTANTS.PLAYER_ID ? CONSTANTS.CPU_ID : CONSTANTS.PLAYER_ID;
    }

    async promptForChoice({ playerId, type, title, description, options, showInfoButton = false }) {
        if (playerId === CONSTANTS.CPU_ID) return this.getCpuChoice(type, options);
        return new Promise(resolve => {
            this.ui.modals.actionTitle.textContent = title;
            this.ui.modals.actionDesc.textContent = description;
            const choicesContainer = this.ui.modals.actionChoices;
            choicesContainer.innerHTML = '';
            const itemContainer = document.createElement('div');
            itemContainer.className = 'modal__choices';
            choicesContainer.appendChild(itemContainer);
            options.forEach(option => {
                const el = type === 'card' ? this.createCardElement(option, CONSTANTS.PLAYER_ID) : document.createElement('button');
                if (type === 'button') {
                    el.classList.add('modal__button');
                    el.textContent = CARD_DATA[option].name;
                }
                el.style.cursor = 'pointer';
                el.onclick = () => { this.ui.modals.action.style.display = 'none'; resolve(option); };
                itemContainer.appendChild(el);
            });
            if (showInfoButton) {
                const infoButton = document.createElement('button');
                infoButton.textContent = '盤面の情報を確認する';
                infoButton.className = 'modal__button modal__button--info';
                infoButton.style.marginTop = '15px';
                infoButton.onclick = () => { this.ui.modals.action.style.display = 'none'; this.showInfoModal(); };
                choicesContainer.appendChild(infoButton);
            }
            this.ui.modals.action.style.display = 'flex';
        });
    }
    
    getCpuChoice(type, options) {
        if (type === 'card') {
            const hero = options.find(c => c.number === CONSTANTS.CARD_NUMBERS.HERO);
            const nonHero = options.find(c => c.number !== CONSTANTS.CARD_NUMBERS.HERO);
            if (hero && nonHero) return nonHero;
            return options.sort((a,b) => a.number - b.number)[0];
        }
        if (type === 'button') {
            const allDiscards = [...this.state.player.discard, ...this.state.cpu.discard];
            const discardCounts = allDiscards.reduce((acc, card) => { acc[card.number] = (acc[card.number] || 0) + 1; return acc; }, {});
            const validGuesses = options.filter(guess => (discardCounts[guess] || 0) < CARD_DATA[guess].count);
            const guessPool = validGuesses.length > 0 ? validGuesses : options;
            return guessPool[Math.floor(Math.random() * guessPool.length)];
        }
        return options[0];
    }

    showInfoModal() {
        let html = '';
        const createSection = (title, cards, owner) => {
            let sectionHtml = `<div class="info-section"><h3>${title}</h3><div class="info-cards">`;
            cards.forEach(card => { sectionHtml += this.createCardElement(card, owner).outerHTML; });
            return sectionHtml + '</div></div>';
        };
        html += createSection('あなたの手札', this.state.player.hand, CONSTANTS.PLAYER_ID);
        html += createSection('あなたの捨て札', this.state.player.discard, 'discard');
        html += createSection('CPUの捨て札', this.state.cpu.discard, 'discard');
        this.ui.modals.infoBody.innerHTML = html;
        this.ui.modals.info.style.display = 'flex';
    }

    handleInfoBackClick() {
        this.ui.modals.info.style.display = 'none';
        this.ui.modals.action.style.display = 'flex';
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    drawCard(playerId) {
        if (this.state.deck.length === 0) {
            this.logMessage('山札がなくなりました！'); return false;
        }
        const card = this.state.deck.pop();
        this.state[playerId].hand.push(card);
        return true;
    }

    discardCard(playerId, handIndex, source = CONSTANTS.EFFECT_SOURCE.EFFECT) {
        const player = this.state[playerId];
        if (player.hand.length <= handIndex) return;
        const card = player.hand.splice(handIndex, 1)[0];
        player.discard.push(card);
        this.logMessage(`${player.name}は「${card.name}」を捨てさせられた。`);
        if (card.number === CONSTANTS.CARD_NUMBERS.HERO) {
            if (source === CONSTANTS.EFFECT_SOURCE.EMPEROR) {
                this.logMessage('「英雄」は「皇帝」によって処刑され、転生できない！');
                player.isOut = true;
            } else {
                this.reincarnate(playerId);
            }
        }
        this.updateUI();
    }

    reincarnate(playerId) {
        const player = this.state[playerId];
        this.logMessage(`「英雄」が捨てられた！ ${player.name}は転生する。`);
        while (player.hand.length > 0) {
            const cardInHand = player.hand.pop();
            player.discard.push(cardInHand);
            this.logMessage(`${player.name}は手札の「${cardInHand.name}」を捨てた。`);
        }
        if (this.state.reincarnationCard) {
            this.logMessage(`${player.name}は転生札を手に入れた！`);
            player.hand.push(this.state.reincarnationCard);
            this.state.reincarnationCard = null;
        } else {
            this.logMessage('しかし、転生札は既になく、脱落した。');
            player.isOut = true;
        }
    }
    
    async revealCard(playerId, handIndex, duration) {
        const card = this.state[playerId].hand[handIndex];
        if (!card) return;
        card.isRevealed = true;
        this.updateUI();
        if (duration > 0) {
            await sleep(duration);
            const cardStillInHand = this.state[playerId].hand.includes(card);
            if (cardStillInHand && card.isRevealed) {
                card.isRevealed = false;
                this.updateUI();
            }
        }
    }
    
    checkWinCondition() {
        const player = this.state.player;
        const cpu = this.state.cpu;
        if (player.isOut) return cpu;
        if (cpu.isOut) return player;
        if (this.state.deck.length === 0 && player.hand.length < 2 && cpu.hand.length < 2) {
            this.logMessage('最終決戦！');
            const pCardNum = player.hand[0]?.number || 0;
            const cCardNum = cpu.hand[0]?.number || 0;
            if (pCardNum > cCardNum) return player;
            if (cCardNum > pCardNum) return cpu;
            return 'draw';
        }
        return null;
    }

    endGame(winner) {
        if (this.state.gameOver) return;
        this.state.gameOver = true;
        let message = '';
        const pCard = this.state.player.hand[0] || { name: 'なし', number: 0 };
        const cCard = this.state.cpu.hand[0] || { name: 'なし', number: 0 };
        const details = `最終手札: あなた[${pCard.name}] vs CPU[${cCard.name}]`;
        message = (winner === 'draw') ? '引き分けです！' : `${winner.name}の勝利です！`;
        this.logMessage(message);
        this.updateUI();
        this.showEndGameModal(message, details);
    }

    showEndGameModal(message, details) {
        this.ui.modals.gameOverTitle.textContent = message;
        this.ui.modals.gameOverDesc.textContent = details;
        this.ui.modals.gameOver.style.display = 'flex';
    }
}
    
window.addEventListener('load', () => {
    new Game();
});


