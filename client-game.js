// Packet Pushers Client - Server-Side Game Edition
// Frontend only handles display and sends actions to server

class GameClient {
    constructor() {
        this.sessionId = null;
        this.gameState = null;
        this.isLoading = false;
    }

    // Initialize new game session
    async startNewGame(playerName) {
        this.isLoading = true;
        this.updateLoadingState('Creating new game...');
        
        try {
            const response = await fetch('/api/game', {
                method: 'GET'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.sessionId = result.session.id;
                this.gameState = result.session;
                this.gameState.player.name = playerName;
                
                this.updateDisplay();
                this.addMessage(`Welcome ${playerName}! Your criminal enterprise begins...`, 'success');
                this.addMessage('You have $2,000 cash and $5,000 debt. Make it count!', 'info');
                
                return true;
            } else {
                this.addMessage('Failed to start game: ' + result.error, 'error');
                return false;
            }
        } catch (error) {
            this.addMessage('Network error: Could not start game', 'error');
            console.error('Start game error:', error);
            return false;
        } finally {
            this.isLoading = false;
        }
    }

    // Send action to server
    async performAction(actionType, actionData) {
        if (this.isLoading) return false;
        
        this.isLoading = true;
        this.updateLoadingState(`Processing ${actionType}...`);
        
        try {
            const response = await fetch('/api/game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    action: {
                        type: actionType,
                        data: actionData,
                        timestamp: Date.now()
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.gameState = result.session;
                this.updateDisplay();
                
                if (result.message) {
                    this.addMessage(result.message, 'success');
                }
                
                // Check for random events
                if (result.events) {
                    result.events.forEach(event => {
                        this.addMessage(event.message, event.type);
                    });
                }
                
                return true;
            } else {
                this.addMessage('Action failed: ' + result.error, 'error');
                return false;
            }
        } catch (error) {
            this.addMessage('Network error: Action failed', 'error');
            console.error('Action error:', error);
            return false;
        } finally {
            this.isLoading = false;
        }
    }

    // Buy drugs
    async buyDrug(drugName, quantity) {
        const drug = this.gameState.currentPrices.find(d => d.name === drugName);
        if (!drug) return false;
        
        const expectedCost = drug.price * quantity;
        
        return await this.performAction('buy', {
            drugName,
            quantity,
            expectedCost
        });
    }

    // Sell drugs
    async sellDrug(drugName, quantity) {
        return await this.performAction('sell', {
            drugName,
            quantity
        });
    }

    // Travel to location
    async travel(destination) {
        return await this.performAction('travel', {
            destination
        });
    }

    // Update display elements
    updateDisplay() {
        if (!this.gameState) return;
        
        const { player, day, currentPrices } = this.gameState;
        
        // Update stats
        document.getElementById('currentDay').textContent = `${day}/${GAME_CONSTANTS.PLAYER.MAX_DAYS}`;
        document.getElementById('playerCash').textContent = `$${player.cash.toLocaleString()}`;
        document.getElementById('playerDebt').textContent = `$${player.debt.toLocaleString()}`;
        document.getElementById('currentLocation').textContent = player.location;
        
        const inventoryCount = Object.values(player.inventory).reduce((a, b) => a + b, 0);
        document.getElementById('inventorySpace').textContent = `${inventoryCount}/${player.maxInventory}`;
        
        // Update market
        this.updateMarketDisplay(currentPrices);
        
        // Update inventory
        this.updateInventoryDisplay(player.inventory);
    }

    updateMarketDisplay(prices) {
        const marketList = document.getElementById('marketList') || document.getElementById('marketPrices');
        if (!marketList) return;
        
        marketList.innerHTML = '';
        prices.forEach(drug => {
            const item = document.createElement('div');
            item.className = 'market-item';
            item.onclick = () => this.showBuyModal(drug);
            item.innerHTML = `
                <div class="item-name">${drug.name}</div>
                <div class="item-price">$${drug.price.toLocaleString()}</div>
            `;
            marketList.appendChild(item);
        });
    }

    updateInventoryDisplay(inventory) {
        const inventoryList = document.getElementById('inventoryList');
        if (!inventoryList) return;
        
        inventoryList.innerHTML = '';
        
        if (Object.keys(inventory).length === 0) {
            inventoryList.innerHTML = '<div class="empty-message">No items in inventory</div>';
            return;
        }
        
        Object.entries(inventory).forEach(([drugName, quantity]) => {
            if (quantity > 0) {
                const currentPrice = this.gameState.currentPrices.find(d => d.name === drugName)?.price || 0;
                const item = document.createElement('div');
                item.className = 'inventory-item';
                item.onclick = () => this.showSellModal(drugName, quantity);
                item.innerHTML = `
                    <div class="item-name">${drugName}</div>
                    <div class="item-quantity">${quantity} units</div>
                    <div class="item-price">$${currentPrice.toLocaleString()} each</div>
                `;
                inventoryList.appendChild(item);
            }
        });
    }

    // Show buy modal
    showBuyModal(drug) {
        const maxAffordable = Math.floor(this.gameState.player.cash / drug.price);
        const inventorySpace = this.gameState.player.maxInventory - 
            Object.values(this.gameState.player.inventory).reduce((a, b) => a + b, 0);
        const maxCanBuy = Math.min(maxAffordable, inventorySpace);
        
        if (maxCanBuy <= 0) {
            this.addMessage("You can't afford any or have no inventory space!", 'error');
            return;
        }

        const content = `
            <p><strong>${drug.name}</strong></p>
            <p><strong>Price:</strong> $${drug.price.toLocaleString()} each</p>
            <p><strong>Max affordable:</strong> ${maxCanBuy}</p>
            <div style="margin-top: 1rem;">
                <button class="action-button" onclick="gameClient.buyDrug('${drug.name}', 1); closeMobileModal();">Buy 1</button>
                <button class="action-button" onclick="gameClient.buyDrug('${drug.name}', 5); closeMobileModal();">Buy 5</button>
                <button class="action-button" onclick="gameClient.buyDrug('${drug.name}', 10); closeMobileModal();">Buy 10</button>
                <button class="action-button" onclick="gameClient.buyDrug('${drug.name}', ${maxCanBuy}); closeMobileModal();">Buy Max (${maxCanBuy})</button>
            </div>
        `;
        showMobileModal('BUY ' + drug.name.toUpperCase(), content);
    }

    // Show sell modal
    showSellModal(drugName, quantity) {
        const currentPrice = this.gameState.currentPrices.find(d => d.name === drugName)?.price || 0;
        
        const content = `
            <p><strong>${drugName}</strong></p>
            <p><strong>Current Price:</strong> $${currentPrice.toLocaleString()} each</p>
            <p><strong>You have:</strong> ${quantity} units</p>
            <div style="margin-top: 1rem;">
                <button class="action-button" onclick="gameClient.sellDrug('${drugName}', 1); closeMobileModal();">Sell 1</button>
                <button class="action-button" onclick="gameClient.sellDrug('${drugName}', 5); closeMobileModal();">Sell 5</button>
                <button class="action-button" onclick="gameClient.sellDrug('${drugName}', 10); closeMobileModal();">Sell 10</button>
                <button class="action-button" onclick="gameClient.sellDrug('${drugName}', ${quantity}); closeMobileModal();">Sell All (${quantity})</button>
            </div>
        `;
        showMobileModal('SELL ' + drugName.toUpperCase(), content);
    }

    updateLoadingState(message) {
        // Update any loading indicators
        console.log('Loading:', message);
    }

    addMessage(message, type = 'info') {
        const gameOutput = document.getElementById('gameOutput');
        if (!gameOutput) return;

        const messageClass = type === 'error' ? 'error-message' : 
                            type === 'success' ? 'success-message' : 
                            type === 'warning' ? 'warning-message' : 'event-message';

        gameOutput.innerHTML += `<span class="${messageClass}">${message}</span><br>`;
        gameOutput.scrollTop = gameOutput.scrollHeight;
    }
}

// Global game client instance
const gameClient = new GameClient();

// Replace existing game functions with client calls
window.startNewGameClient = function() {
    const playerName = prompt('Enter your dealer name:') || 'Anonymous Dealer';
    gameClient.startNewGame(playerName);
};

function showMobileModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('mobileModal').style.display = 'flex';
}

function closeMobileModal() {
    document.getElementById('mobileModal').style.display = 'none';
}