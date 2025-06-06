// Game state
let deck = [], playerHand = [], dealerHand = [];
let gameState = 'betting', wins = 0, losses = 0, showDealerCard = false;
let balance = 1000, currentBet = 0, totalWinnings = 0;

// Constants
const suits = ['♠', '♥', '♦', '♣'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Utility functions
const createDeck = () => suits.flatMap(suit => values.map(value => ({ 
    suit, value, color: ['♥', '♦'].includes(suit) ? 'red' : 'black' 
})));

const shuffleDeck = deck => [...deck].sort(() => Math.random() - 0.5);

const getCardValue = card => card.value === 'A' ? 11 : ['J', 'Q', 'K'].includes(card.value) ? 10 : +card.value;

const calculateScore = hand => {
    let score = hand.reduce((sum, card) => sum + getCardValue(card), 0);
    let aces = hand.filter(card => card.value === 'A').length;
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    return score;
};

// DOM updates
const updateElement = (id, value) => document.getElementById(id).textContent = value;
const updateGameMessage = msg => updateElement('gameMessage', msg);
const updateStats = () => {
    updateElement('wins', wins);
    updateElement('losses', losses);
    updateElement('balance', balance);
    updateElement('currentBet', currentBet);
    updateElement('totalWinnings', totalWinnings);
};

const showControls = controlIds => {
    ['newGameBtn', 'hitBtn', 'standBtn', 'dealBtn', 'clearBetBtn', 'chip5', 'chip25', 'chip100'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = controlIds.includes(id) ? 'inline-block' : 'none';
    });
};

const createCardElement = (card, hidden = false) => {
    const cardDiv = document.createElement('div');
    cardDiv.className = `playing-card ${card.color}${hidden ? ' hidden' : ''}`;
    cardDiv.innerHTML = hidden ? '<div>?</div><div>?</div>' : `<div>${card.value}</div><div>${card.suit}</div>`;
    return cardDiv;
};

const renderCards = (containerId, hand, hideSecond = false) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    hand.forEach((card, i) => container.appendChild(createCardElement(card, hideSecond && i === 1)));
};

// Dialog functions
const showDialog = (dialogId, message) => {
    document.getElementById(dialogId).style.display = 'flex';
    updateElement(dialogId === 'winDialog' ? 'winMessage' : 'loseMessage', message);
};

const closeDialog = dialogId => document.getElementById(dialogId).style.display = 'none';

// Betting functions
const placeBet = amount => {
    if (gameState !== 'betting' || balance < amount) {
        updateGameMessage(balance < amount ? 'Insufficient balance!' : 'Cannot bet now!');
        return;
    }
    currentBet += amount;
    balance -= amount;
    updateStats();
    updateGameMessage(`Current bet: $${currentBet}. Click "Deal Cards" when ready!`);
    if (currentBet > 0) showControls(['dealBtn', 'clearBetBtn']);
};

const clearBet = () => {
    if (gameState !== 'betting') return;
    balance += currentBet;
    currentBet = 0;
    updateStats();
    updateGameMessage('Place your bet to start the game!');
    showControls(['chip5', 'chip25', 'chip100']);
};

// Game functions
const startNewGame = () => {
    gameState = 'betting';
    currentBet = 0;
    playerHand = [];
    dealerHand = [];
    showDealerCard = false;
    
    ['playerCards', 'dealerCards'].forEach(id => document.getElementById(id).innerHTML = '');
    updateElement('playerScore', '0');
    updateElement('dealerScore', '0');
    updateGameMessage('Place your bet to start the game!');
    updateStats();
    showControls(['chip5', 'chip25', 'chip100']);
};

const dealCards = () => {
    if (currentBet === 0) return updateGameMessage('Please place a bet first!');
    
    gameState = 'playing';
    deck = shuffleDeck(createDeck());
    playerHand = [deck.pop(), deck.pop()];
    dealerHand = [deck.pop(), deck.pop()];
    
    renderCards('playerCards', playerHand);
    renderCards('dealerCards', dealerHand, true);
    updateElement('playerScore', calculateScore(playerHand));
    updateElement('dealerScore', '?');
    
    const playerScore = calculateScore(playerHand);
    if (playerScore === 21) {
        handleBlackjack();
    } else {
        updateGameMessage(`Your turn! Current bet: $${currentBet}`);
        showControls(['hitBtn', 'standBtn']);
    }
};

const handleBlackjack = () => {
    renderCards('dealerCards', dealerHand);
    updateElement('dealerScore', calculateScore(dealerHand));
    gameState = 'finished';
    
    const dealerScore = calculateScore(dealerHand);
    if (dealerScore === 21) {
        balance += currentBet;
        updateGameMessage('Push! Both have blackjack - bet returned.');
        showDialog('winDialog', 'Push! Both have blackjack. Your bet has been returned.');
    } else {
        const winnings = Math.floor(currentBet * 2.5);
        balance += winnings;
        totalWinnings += winnings - currentBet;
        wins++;
        updateGameMessage(`Blackjack! You win $${winnings}!`);
        showDialog('winDialog', `Blackjack! You won $${winnings}!`);
    }
    
    currentBet = 0;
    updateStats();
    showControls(['newGameBtn']);
};

const hit = () => {
    if (gameState !== 'playing' || deck.length === 0) return;
    
    playerHand.push(deck.pop());
    renderCards('playerCards', playerHand);
    
    const playerScore = calculateScore(playerHand);
    updateElement('playerScore', playerScore);
    
    if (playerScore > 21) {
        gameState = 'finished';
        losses++;
        const lostAmount = currentBet;
        totalWinnings -= currentBet;
        currentBet = 0;
        renderCards('dealerCards', dealerHand);
        updateElement('dealerScore', calculateScore(dealerHand));
        updateStats();
        updateGameMessage(`Bust! You lose $${lostAmount}!`);
        showDialog('loseDialog', `Bust! You went over 21 and lost $${lostAmount}!`);
        showControls(['newGameBtn']);
    } else if (playerScore === 21) {
        stand();
    }
};

const stand = () => {
    if (gameState !== 'playing') return;
    
    gameState = 'dealer';
    renderCards('dealerCards', dealerHand);
    updateElement('dealerScore', calculateScore(dealerHand));
    updateGameMessage('Dealer is playing...');
    showControls([]);
    
    setTimeout(playDealerHand, 1000);
};

const playDealerHand = () => {
    let dealerScore = calculateScore(dealerHand);
    
    const dealNextCard = () => {
        if (dealerScore < 17 && deck.length > 0) {
            dealerHand.push(deck.pop());
            dealerScore = calculateScore(dealerHand);
            renderCards('dealerCards', dealerHand);
            updateElement('dealerScore', dealerScore);
            setTimeout(dealNextCard, 1000);
        } else {
            determineWinner();
        }
    };
    
    dealNextCard();
};

const determineWinner = () => {
    const playerScore = calculateScore(playerHand);
    const dealerScore = calculateScore(dealerHand);
    const betAmount = currentBet;
    
    gameState = 'finished';
    currentBet = 0;
    
    let message, dialogType = 'loseDialog';
    
    if (dealerScore > 21) {
        const winnings = betAmount * 2;
        balance += winnings;
        totalWinnings += betAmount;
        wins++;
        message = `Dealer busts! You won $${winnings}!`;
        dialogType = 'winDialog';
    } else if (playerScore > dealerScore) {
        const winnings = betAmount * 2;
        balance += winnings;
        totalWinnings += betAmount;
        wins++;
        message = `You won $${winnings}! ${playerScore} beats ${dealerScore}!`;
        dialogType = 'winDialog';
    } else if (dealerScore > playerScore) {
        losses++;
        totalWinnings -= betAmount;
        message = `You lost $${betAmount}! Dealer has ${dealerScore}, you have ${playerScore}.`;
    } else {
        balance += betAmount;
        message = `Push! Both have ${playerScore}. Your bet of $${betAmount} has been returned.`;
        dialogType = 'winDialog';
    }
    
    updateStats();
    updateGameMessage(message);
    showDialog(dialogType, message);
    showControls(['newGameBtn']);
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    updateGameMessage('Click "New Game" to start!');
    showControls(['newGameBtn']);
});