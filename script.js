// Packet Pushers Game Logic
// Complete implementation of the classic drug dealing game

// === CONSOLIDATED UTILITY FUNCTIONS ===

// Location service validation consolidation
function hasLocationService(serviceType) {
    const [city, district] = gameState.player.location.split(' - ');
    const locationData = gameState.locationServices[city] && gameState.locationServices[city][district];
    return locationData && locationData.services && locationData.services.includes(serviceType);
}

function requireLocationService(serviceType, serviceName) {
    if (!hasLocationService(serviceType)) {
        const serviceMessages = {
            'weapons': 'There is no weapon shop in this location. Weapon shops are found in shady areas like docks and rough neighborhoods.',
            'clothes': 'There is no clothes shop in this location. Clothes shops are found in market areas and commercial districts.',
            'bank': 'There is no bank in this location. Banks are found in finance districts and city centers.'
        };
        
        const message = serviceMessages[serviceType] || `There is no ${serviceName} in this location.`;
        addMessage(message, 'error');
        return false;
    }
    return true;
}

// Price validation consolidation
function validatePrice(price, itemName) {
    if (!price || price <= 0 || !isFinite(price)) {
        addMessage(`⚠️ Invalid price for ${itemName}. Market data corrupted.`, 'error');
        playSound('uhoh');
        return false;
    }
    return true;
}

// Game constants consolidation
const GAME_CONSTANTS = {
    PLAYER: {
        STARTING_CASH: 2000,
        STARTING_DEBT: 5000,
        MAX_DAYS: 30,
        BASE_INVENTORY: 100
    },
    TRAVEL: {
        INTERCITY_COST: 20,
        DAILY_INTEREST_RATE: 0.05
    },
    COMBAT: {
        OFFICER_BASE_STRENGTH: 3,
        MUGGER_BASE_STRENGTH: 2,
        RUBBER_CHICKEN_INSTANT_WIN_CHANCE: 0.25,
        RUBBER_CHICKEN_CONFUSION_BONUS: 3
    },
    MARKET: {
        DRUG_BUST_MULTIPLIER: 4.0,
        ADDICTS_MULTIPLIER: 8.0,
        SURGE_MIN_MULTIPLIER: 1.5,
        SURGE_MAX_MULTIPLIER: 3.0,
        CRASH_MIN_MULTIPLIER: 0.3,
        CRASH_MAX_MULTIPLIER: 0.7
    },
    AUDIO: {
        DEFAULT_VOLUME: 0.3
    },
    EVENTS: {
        HEALTH_ISSUE_MIN_COST: 100,
        HEALTH_ISSUE_MAX_COST: 200,
        FIND_CASH_MIN: 50,
        FIND_CASH_MAX: 200,
        BRIBE_MIN: 200,
        BRIBE_MAX: 500,
        MUGGER_CASH_LOSS_MULTIPLIER: 0.1,
        AGGRESSIVE_MUGGER_MULTIPLIER: 0.2,
        INFORMANT_TIP_MIN: 10,
        INFORMANT_TIP_MAX: 30
    },
    CHASE: {
        HEAVY_LOAD_THRESHOLD: 50,
        MODERATE_LOAD_THRESHOLD: 20,
        HEAVY_LOAD_DROP_CHANCE: 0.7,
        MODERATE_LOAD_DROP_CHANCE: 0.5,
        LIGHT_LOAD_DROP_CHANCE: 0.3,
        DROP_PERCENTAGE_MIN: 0.3,
        DROP_PERCENTAGE_MAX: 0.7
    },
    PRICING: {
        WEAPON_ECCENTRIC_MIN_MULTIPLIER: 0.8,
        WEAPON_ECCENTRIC_MAX_MULTIPLIER: 1.2,
        WEAPON_INTIMIDATING_MULTIPLIER: 1.2,
        COAT_EXPENSIVE_MULTIPLIER: 1.3,
        COAT_SELL_MULTIPLIER: 0.5,
        WEAPON_SELL_MULTIPLIER: 0.5
    }
};

// === CONSOLIDATED UTILITY FUNCTIONS ===

// Confirmation dialog utility
function showConfirmationDialog(message, onConfirm, onCancel = null) {
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-overlay';
    overlay.innerHTML = `
        <div class="confirmation-dialog">
            <h3>Confirm Purchase</h3>
            <p>${message}</p>
            <div class="confirmation-actions">
                <button class="confirm-btn" id="confirmYes">Yes</button>
                <button class="cancel-btn" id="confirmNo">No</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Handle Yes button
    document.getElementById('confirmYes').addEventListener('click', () => {
        document.body.removeChild(overlay);
        if (onConfirm) onConfirm();
    });
    
    // Handle No button
    document.getElementById('confirmNo').addEventListener('click', () => {
        document.body.removeChild(overlay);
        if (onCancel) onCancel();
    });
    
    // Handle Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            if (onCancel) onCancel();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Focus on No button by default for safety
    document.getElementById('confirmNo').focus();
}

// Financial transaction utilities
function validateAffordability(cost, itemName) {
    if (gameState.player.cash < cost) {
        addMessage(`You need $${cost.toLocaleString()} but only have $${gameState.player.cash.toLocaleString()}!`, 'error');
        playSound('uhoh');
        return false;
    }
    return true;
}

function processTransaction(cost, itemName, successMessage, successSound = 'cashreg') {
    gameState.player.cash -= cost;
    addMessage(successMessage, 'success');
    playSound(successSound);
    updateDisplay();
}

function processSale(sellPrice, itemName, successMessage, successSound = 'cashreg') {
    gameState.player.cash += sellPrice;
    addMessage(successMessage, 'success');
    playSound(successSound);
    updateDisplay();
}

// Message and sound utilities
function errorMessage(message, sound = 'uhoh') {
    addMessage(message, 'error');
    playSound(sound);
}

function successMessage(message, sound = 'cashreg') {
    addMessage(message, 'success');
    playSound(sound);
}

function eventMessage(message, sound = null) {
    addMessage(message, 'event');
    if (sound) playSound(sound);
}

// Inventory utilities
function hasInventorySpace(amount = 1) {
    const currentSize = Object.values(gameState.player.inventory).reduce((sum, amt) => sum + amt, 0);
    return currentSize + amount <= getCurrentMaxInventory();
}

function validateInventorySpace(amount, itemName) {
    if (!hasInventorySpace(amount)) {
        errorMessage(`You don't have enough inventory space for ${amount} ${itemName}!`);
        return false;
    }
    return true;
}

// Quantity control utilities (for inventory panel)
function adjustQuantity(btn, delta) {
    const input = btn.parentElement.querySelector('.qty-input');
    const currentValue = parseInt(input.value) || 1;
    const newValue = Math.max(1, Math.min(999, currentValue + delta));
    input.value = newValue;
}

function sellDrugDirect(drugName, btn) {
    const qtyInput = btn.parentElement.querySelector('.qty-input');
    const quantity = parseInt(qtyInput.value) || 1;
    
    const currentAmount = gameState.player.inventory[drugName] || 0;
    if (currentAmount < quantity) {
        return errorMessage(`You only have ${currentAmount} ${drugName}!`);
    }
    
    const price = gameState.currentPrices[drugName];
    const totalValue = price * quantity;
    
    // Execute sale
    gameState.player.inventory[drugName] -= quantity;
    if (gameState.player.inventory[drugName] <= 0) {
        delete gameState.player.inventory[drugName];
    }
    
    processSale(totalValue, `${quantity} ${drugName}`, 
        `💰 Sold ${quantity} ${drugName} for $${totalValue.toLocaleString()}!`);
    
    // Reset quantity input
    qtyInput.value = '1';
    
    // Update displays
    updateInventoryDisplay();
    updateMarketDisplay();
}

function sellAllDrug(drugName) {
    const currentAmount = gameState.player.inventory[drugName] || 0;
    if (currentAmount === 0) {
        return errorMessage(`You don't have any ${drugName}!`);
    }
    
    const price = gameState.currentPrices[drugName];
    const totalValue = price * currentAmount;
    
    // Execute sale
    delete gameState.player.inventory[drugName];
    
    processSale(totalValue, `${currentAmount} ${drugName}`, 
        `💰 Sold all ${currentAmount} ${drugName} for $${totalValue.toLocaleString()}!`);
    
    // Update displays
    updateInventoryDisplay();
    updateMarketDisplay();
}

function showClickableTravelInterface() {
    const gameOutput = document.getElementById('gameOutput');
    const currentLocation = gameState.player.location;
    const [currentCity, currentDistrict] = currentLocation.split(' - ');
    const isAtAirport = currentDistrict.toLowerCase().includes('airport');
    
    // Build list of available destinations
    const availableDestinations = [];
    
    // Add local districts (within same city)
    gameState.cities[currentCity].forEach(district => {
        if (district !== currentDistrict) {
            availableDestinations.push({
                name: district,
                fullName: `${currentCity} - ${district}`,
                type: 'local',
                cost: 'FREE',
                services: getLocationServices(currentCity, district)
            });
        }
    });
    
    // Add other cities (only if at airport)
    if (isAtAirport) {
        Object.keys(gameState.cities).forEach(city => {
            if (city !== currentCity) {
                const airportDistrict = gameState.cities[city][0];
                availableDestinations.push({
                    name: city,
                    fullName: `${city} - ${airportDistrict}`,
                    type: 'intercity',
                    cost: '$20',
                    services: getLocationServices(city, airportDistrict)
                });
            }
        });
    }
    
    // Separate local and intercity destinations
    const localDestinations = availableDestinations.filter(dest => dest.type === 'local');
    const intercityDestinations = availableDestinations.filter(dest => dest.type === 'intercity');
    
    let travelHtml = `
        <div class="simple-travel-interface">
            <div class="travel-header">
                <h3>🚗 TRAVEL</h3>
                <span class="current-location">${currentLocation}</span>
            </div>
    `;
    
    // Local travel section
    if (localDestinations.length > 0) {
        travelHtml += `
            <div class="travel-section">
                <h4 class="section-title">🚶 Local Travel (Free)</h4>
                <div class="desktop-actions">
        `;
        
        localDestinations.forEach(dest => {
            const serviceIcons = dest.services.map(s => {
                switch(s) {
                    case 'weapons': return '🔫';
                    case 'clothes': return '🧥';
                    case 'bank': return '🏦';
                    default: return '';
                }
            }).join('');
            
            travelHtml += `
                <button class="desktop-btn" onclick="travelToDirect('${dest.fullName}')">
                    ${dest.name} ${serviceIcons}
                </button>
            `;
        });
        
        travelHtml += `
                </div>
            </div>
        `;
    }
    
    // Intercity travel section
    if (intercityDestinations.length > 0) {
        travelHtml += `
            <div class="travel-section">
                <h4 class="section-title">✈️ City Travel ($20)</h4>
                <div class="desktop-actions">
        `;
        
        intercityDestinations.forEach(dest => {
            const serviceIcons = dest.services.map(s => {
                switch(s) {
                    case 'weapons': return '🔫';
                    case 'clothes': return '🧥';
                    case 'bank': return '🏦';
                    default: return '';
                }
            }).join('');
            
            travelHtml += `
                <button class="desktop-btn" onclick="travelToDirect('${dest.fullName}')">
                    ${dest.name} ${serviceIcons}
                </button>
            `;
        });
        
        travelHtml += `
                </div>
            </div>
        `;
    } else if (!isAtAirport) {
        travelHtml += `
            <div class="travel-section">
                <h4 class="section-title">✈️ City Travel</h4>
                <div class="travel-note">🛫 Go to airport to travel between cities</div>
            </div>
        `;
    }
    
    travelHtml += `
            <div class="travel-footer">
                <button class="travel-btn" onclick="exitTravelMode()">Cancel</button>
            </div>
        </div>
    `;
    
    gameOutput.innerHTML = travelHtml;
}

function getLocationServices(city, district) {
    return gameState.locationServices[city] && gameState.locationServices[city][district] 
        ? gameState.locationServices[city][district].services || []
        : [];
}

function travelToDirect(fullLocationName) {
    const currentLocation = gameState.player.location;
    const [currentCity] = currentLocation.split(' - ');
    const [destCity] = fullLocationName.split(' - ');
    
    const isIntercity = currentCity !== destCity;
    const cost = isIntercity ? GAME_CONSTANTS.TRAVEL.INTERCITY_COST : 0;
    
    if (isIntercity && !validateAffordability(cost, 'travel')) {
        return;
    }
    
    // Execute travel
    gameState.player.location = fullLocationName;
    
    if (isIntercity) {
        gameState.player.cash -= cost;
        gameState.player.day += 1;
        
        // Apply daily interest
        const interest = Math.floor(gameState.player.debt * GAME_CONSTANTS.TRAVEL.DAILY_INTEREST_RATE);
        gameState.player.debt += interest;
        
        addMessage(`✈️ Traveled to ${fullLocationName} for $${cost}. Day ${gameState.player.day}.`, 'success');
        addMessage(`💸 Daily interest: +$${interest.toLocaleString()} debt`, 'event');
    } else {
        // Local travel also takes a day
        gameState.player.day += 1;
        
        // Apply daily interest
        const interest = Math.floor(gameState.player.debt * GAME_CONSTANTS.TRAVEL.DAILY_INTEREST_RATE);
        gameState.player.debt += interest;
        
        addMessage(`🚶 Traveled to ${fullLocationName}. Day ${gameState.player.day}.`, 'success');
        addMessage(`💸 Daily interest: +$${interest.toLocaleString()} debt`, 'event');
    }
    
    // Generate new market prices (this will trigger market updates)
    generateMarketPrices();
    
    // Update location services
    updateLocationServiceButtons();
    
    // Random events
    let hasMarketUpdate = false;
    if (Math.random() < 0.3) {
        hasMarketUpdate = triggerRandomEvent();
    }
    
    // Play appropriate sound: headlines for market updates or intercity travel
    if (hasMarketUpdate) {
        playSound('headlines');
    } else if (isIntercity) {
        playSound('headlines');
    }
    // Local travel with no market event is silent
    
    // Exit travel mode and update display
    exitTravelMode();
    updateDisplay();
}

function exitTravelMode() {
    navigationState.isNavigating = false;
    navigationState.currentMode = 'normal';
    
    // Restore normal game output
    const gameOutput = document.getElementById('gameOutput');
    gameOutput.innerHTML = `
        <div class="welcome-message">
            <p>Welcome to Packet Pushers!</p>
            <p>You owe the loan shark $${gameState.player.debt.toLocaleString()} with daily interest.</p>
            <p>You have ${GAME_CONSTANTS.PLAYER.MAX_DAYS - gameState.player.day + 1} days left.</p>
            <p>Use the clickable interface to buy, sell, and manage your operations.</p>
        </div>
    `;
    
    addMessage('Travel mode deactivated.', 'info');
}

// Combat system consolidation class
class CombatSystem {
    static calculate(weapon, opponent) {
        // Check for Rubber Chicken instant win
        if (weapon.name === 'Rubber Chicken') {
            if (Math.random() < GAME_CONSTANTS.COMBAT.RUBBER_CHICKEN_INSTANT_WIN_CHANCE) {
                return { result: 'instant_win', reason: 'psychological_breakdown' };
            }
        }
        
        let playerAdvantage = weapon.damage;
        let opponentAdvantage = opponent.baseStrength;
        
        // Apply opponent category modifiers
        if (opponent.category === 'mugger') {
            playerAdvantage += 1; // Slight advantage against muggers
        }
        
        // Apply opponent type modifiers
        if (opponent.typeModifiers && opponent.typeModifiers[opponent.type]) {
            opponentAdvantage = opponent.typeModifiers[opponent.type];
        }
        
        // Special weapon bonuses
        if (weapon.name === 'Rubber Chicken') {
            opponentAdvantage = Math.max(1, opponentAdvantage - GAME_CONSTANTS.COMBAT.RUBBER_CHICKEN_CONFUSION_BONUS);
        }
        
        const total = playerAdvantage + opponentAdvantage;
        const outcome = Math.random() * total;
        
        return {
            result: outcome < playerAdvantage ? 'player_wins' : 'opponent_wins',
            playerAdvantage,
            opponentAdvantage,
            outcome
        };
    }
    
    static handleResult(combatResult, weapon, opponent, messages) {
        playSound(weapon.hitSound);
        
        if (combatResult.result === 'instant_win') {
            return this.handleInstantWin(weapon, opponent, messages);
        } else if (combatResult.result === 'player_wins') {
            return this.handlePlayerVictory(weapon, opponent, messages);
        } else {
            return this.handlePlayerDefeat(weapon, opponent, messages);
        }
    }
    
    static handleInstantWin(weapon, opponent, messages) {
        addMessage(messages.instantWin, 'event');
        return { victory: true, special: true };
    }
    
    static handlePlayerVictory(weapon, opponent, messages) {
        addMessage(messages.victory, 'event');
        if (weapon.hitSoundHit) {
            setTimeout(() => playSound(weapon.hitSoundHit), 500);
        }
        return { victory: true, special: false };
    }
    
    static handlePlayerDefeat(weapon, opponent, messages) {
        addMessage(messages.defeat, 'event');
        return { victory: false, special: false };
    }
}

// Mobile modal management consolidation
class MobileModalManager {
    static show(action, items, priceGetter, options = {}) {
        const modal = document.getElementById('mobileModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        const titles = {
            'buy': '💰 BUY DRUGS',
            'sell': '💸 SELL DRUGS',
            'charts': '📊 PRICE CHARTS',
            'travel': '🚗 TRAVEL'
        };
        
        modalTitle.textContent = titles[action] || 'SELECT ITEM';
        
        let itemsHtml = '<div class="mobile-item-list">';
        
        items.forEach(item => {
            const price = priceGetter(item);
            const indicators = this.getPriceIndicators(item, price, action);
            const itemData = this.getItemData(item, action);
            
            itemsHtml += `
                <div class="mobile-item ${itemData.disabled ? 'disabled' : ''}" 
                     onclick="${itemData.disabled ? '' : itemData.clickHandler}">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">${itemData.name}</div>
                        <div class="mobile-item-price">${itemData.priceText}</div>
                    </div>
                    <div class="mobile-item-action">
                        ${itemData.actionText}
                    </div>
                </div>
            `;
        });
        
        itemsHtml += '</div>';
        modalBody.innerHTML = itemsHtml;
        modal.style.display = 'flex';
    }
    
    static getPriceIndicators(item, price, action) {
        if (action === 'travel' || action === 'charts') return '';
        
        const drugName = typeof item === 'string' ? item : item.name;
        const previousPrice = gameState.previousPrices[drugName];
        
        if (!previousPrice) return '';
        
        if (price > previousPrice) {
            return '<span class="price-up">↑</span>';
        } else if (price < previousPrice) {
            return '<span class="price-down">↓</span>';
        } else {
            return '<span class="price-same">↕</span>';
        }
    }
    
    static getItemData(item, action) {
        switch (action) {
            case 'buy':
                return this.getBuyItemData(item);
            case 'sell':
                return this.getSellItemData(item);
            case 'charts':
                return this.getChartsItemData(item);
            case 'travel':
                return this.getTravelItemData(item);
            default:
                return { name: item, priceText: '', actionText: '', disabled: false, clickHandler: '' };
        }
    }
    
    static getBuyItemData(drug) {
        const price = gameState.currentPrices[drug.name];
        const basePrice = drug.basePrice;
        const priceRatio = price / basePrice;
        
        let extremeIcon = '';
        if (priceRatio >= 3.0) {
            extremeIcon = '🚀'; // High prices
        } else if (priceRatio <= 0.5) {
            extremeIcon = '💎'; // Low prices
        }
        
        return {
            name: drug.name,
            priceText: `${this.getPriceIndicators(drug, price, 'buy')} $${price} ${extremeIcon}`,
            actionText: '💰 BUY',
            disabled: false,
            clickHandler: `selectMobileItem('${drug.name}', ${price})`
        };
    }
    
    static getSellItemData(drugName) {
        const amount = gameState.player.inventory[drugName];
        const price = gameState.currentPrices[drugName];
        const drugData = gameState.drugs.find(d => d.name === drugName);
        const basePrice = drugData ? drugData.basePrice : price;
        const priceRatio = price / basePrice;
        
        let extremeIcon = '';
        if (priceRatio >= 3.0) {
            extremeIcon = '🚀'; // High prices
        } else if (priceRatio <= 0.5) {
            extremeIcon = '💎'; // Low prices
        }
        
        return {
            name: drugName,
            priceText: `${this.getPriceIndicators(drugName, price, 'sell')} $${price} ${extremeIcon} (${amount} owned)`,
            actionText: '💸 SELL',
            disabled: false,
            clickHandler: `selectMobileItem('${drugName}', ${price})`
        };
    }
    
    static getChartsItemData(drug) {
        const currentPrice = gameState.currentPrices[drug.name] || 0;
        const history = gameState.priceHistory[drug.name];
        const hasHistory = history && history.length > 0;
        
        return {
            name: drug.name,
            priceText: hasHistory ? `Current: $${currentPrice} | ${history.length} days` : 'No price history',
            actionText: hasHistory ? '📈 VIEW' : '❌ N/A',
            disabled: !hasHistory,
            clickHandler: hasHistory ? `showMobileChart('${drug.name}')` : ''
        };
    }
    
    static getTravelItemData(location) {
        const isCurrent = location === gameState.player.location;
        const cost = isCurrent ? 0 : GAME_CONSTANTS.TRAVEL.INTERCITY_COST;
        
        return {
            name: location,
            priceText: isCurrent ? 'Current Location' : `Cost: $${cost}`,
            actionText: isCurrent ? '📍 HERE' : '🚗 GO',
            disabled: false,
            clickHandler: `selectMobileCity('${location}')`
        };
    }
}

// Navigation highlighting consolidation
class NavigationHighlighter {
    static highlight(containerSelector, itemSelector, selectedIndex, panelSelector = null) {
        this.clearHighlights();
        
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const items = container.querySelectorAll(itemSelector);
        if (items[selectedIndex]) {
            items[selectedIndex].classList.add('selected');
            items[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Add navigation mode to panel if specified
            if (panelSelector) {
                const panel = document.querySelector(panelSelector);
                if (panel) {
                    panel.classList.add('navigation-mode');
                }
            }
        }
    }
    
    static clearHighlights() {
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.navigation-mode').forEach(el => el.classList.remove('navigation-mode'));
    }
    
    static highlightMarketItem(selectedIndex) {
        this.highlight('.market-list', '.market-item', selectedIndex, '.market-panel');
    }
    
    static highlightInventoryItem(selectedIndex) {
        this.highlight('.inventory-list', '.inventory-item', selectedIndex, '.inventory-panel');
    }
    
    static highlightCityOption(selectedIndex) {
        this.clearHighlights();
        const cityOptions = document.querySelectorAll('.city-option');
        if (cityOptions[selectedIndex]) {
            cityOptions.forEach(option => option.classList.remove('selected'));
            cityOptions[selectedIndex].classList.add('selected');
        }
    }
}

// Notification system consolidation
class NotificationSystem {
    static notify(message, type = 'normal', sound = null) {
        addMessage(message, type);
        if (sound) {
            playSound(sound);
        }
    }
    
    static success(message, sound = 'cashreg') {
        this.notify(message, 'success', sound);
    }
    
    static error(message, sound = 'uhoh') {
        this.notify(message, 'error', sound);
    }
    
    static event(message, sound = null) {
        this.notify(message, 'event', sound);
    }
    
    static info(message, sound = null) {
        this.notify(message, 'info', sound);
    }
    
    // Specialized notification methods
    static cashSuccess(message) {
        this.success(message, 'cashreg');
    }
    
    static transactionError(message) {
        this.error(message, 'uhoh');
    }
    
    static combatEvent(message, sound = null) {
        this.event(message, sound);
    }
    
    static navigationSound(message, type = 'success') {
        this.notify(message, type, 'touchsound');
    }
}

// Game state object
let gameState = {
    player: {
        cash: GAME_CONSTANTS.PLAYER.STARTING_CASH,
        debt: GAME_CONSTANTS.PLAYER.STARTING_DEBT,
        bankBalance: 0, // Secure money in bank
        inventory: {},
        location: 'New York - Brooklyn Docks',
        day: 1,
        maxDays: GAME_CONSTANTS.PLAYER.MAX_DAYS,
        maxInventory: GAME_CONSTANTS.PLAYER.BASE_INVENTORY,
        weapon: null, // Deprecated - use weapons array
        weapons: [], // Player can own up to 2 weapons
        coat: null,
        purchaseHistory: {}, // Track purchase history for profit/loss calculations
        debtHistory: [], // Track debt payments and interest charges
        initialDebt: GAME_CONSTANTS.PLAYER.STARTING_DEBT // Starting debt amount
    },
    cities: {
        'New York': ['JFK Airport', 'Brooklyn Docks', 'Times Square', 'Central Park'],
        'Los Angeles': ['LAX Airport', 'Hollywood Hills', 'Venice Beach', 'Compton'],
        'Chicago': ['O\'Hare Airport', 'The Loop', 'Wicker Park', 'South Side'],
        'Miami': ['Miami Airport', 'South Beach', 'Little Havana', 'Biscayne Bay'],
        'Detroit': ['Detroit Airport', 'Corktown', 'Greektown', 'Belle Isle'],
        'Boston': ['Logan Airport', 'Back Bay', 'North End', 'Fenway']
    },
    availableLocations: [],
    currentAvailableDestinations: [],
    drugs: [
        { name: '🧪 Acid', basePrice: 1000, volatility: 0.9 },
        { name: '❄️ Cocaine', basePrice: 15000, volatility: 0.2 },
        { name: '🟫 Hash', basePrice: 150, volatility: 0.7 },
        { name: '💉 Heroin', basePrice: 5000, volatility: 0.3 },
        { name: '💊 Molly', basePrice: 10, volatility: 0.9 },
        { name: '🧊 Ice', basePrice: 311, volatility: 0.8 },
        { name: '🌺 Opium', basePrice: 548, volatility: 0.7 },
        { name: '🪨 Crack', basePrice: 1000, volatility: 0.6 },
        { name: '🌵 Peyote', basePrice: 122, volatility: 0.9 },
        { name: '🍄 Mushrooms', basePrice: 600, volatility: 0.8 },
        { name: '⚡ Speed', basePrice: 70, volatility: 0.9 },
        { name: '🌿 Weed', basePrice: 300, volatility: 0.8 },
        { name: '🦄 Special K', basePrice: 471, volatility: 0.7 }
    ],
    weapons: [
        { name: 'Pea Shooter', price: 50, damage: 1, hitSound: 'peashoot', hitSoundHit: 'peashoothit', description: 'A basic weapon with minimum damage' },
        { name: 'Catapult', price: 200, damage: 2, hitSound: 'catapult', hitSoundHit: 'catapulthit', description: 'A medieval-style ranged weapon' },
        { name: 'Handbag', price: 150, damage: 3, hitSound: 'handbag', hitSoundHit: 'handbaghit', description: 'A surprisingly effective blunt weapon' },
        { name: 'Monkey Wrench', price: 300, damage: 4, hitSound: 'monkey', hitSoundHit: 'monkeyhit', description: 'A heavy tool that doubles as a weapon' },
        { name: 'Rubber Chicken', price: 100, damage: 8, hitSound: 'chicken', hitSoundHit: 'chickenhit', description: 'Found in a dumpster behind a failed comedy club, this weapon has driven three dealers to early retirement and caused two police precincts to require therapy sessions' },
        { name: 'Pistol', price: 500, damage: 4, hitSound: 'pistol', hitSoundHit: 'pistolhit', description: 'A reliable firearm with decent damage' }
    ],
    coats: [
        { name: 'Trench Coat', price: 200, capacity: 120, description: 'Classic detective coat with hidden pockets' },
        { name: 'Bomber Jacket', price: 350, capacity: 140, description: 'Stylish jacket with multiple compartments' },
        { name: 'Cargo Vest', price: 500, capacity: 160, description: 'Tactical vest with numerous pockets' },
        { name: 'Duster Coat', price: 750, capacity: 180, description: 'Long coat with deep interior pockets' },
        { name: 'Smuggler\'s Coat', price: 1000, capacity: 200, description: 'Professional-grade smuggling coat' }
    ],
    locationServices: {
        'New York': {
            'JFK Airport': { services: [] },
            'Brooklyn Docks': { services: ['weapons'] }, // Shady docks area
            'Times Square': { services: ['clothes', 'bank'] }, // Commercial center
            'Central Park': { services: [] }
        },
        'Los Angeles': {
            'LAX Airport': { services: [] },
            'Hollywood Hills': { services: ['bank'] }, // Upscale area
            'Venice Beach': { services: ['clothes'] }, // Trendy area
            'Compton': { services: ['weapons'] } // Rough neighborhood
        },
        'Chicago': {
            'O\'Hare Airport': { services: [] },
            'The Loop': { services: ['bank', 'clothes'] }, // Financial district
            'Wicker Park': { services: [] },
            'South Side': { services: ['weapons'] } // Dangerous area
        },
        'Miami': {
            'Miami Airport': { services: [] },
            'South Beach': { services: ['clothes', 'bank'] }, // Tourist/upscale area
            'Little Havana': { services: ['weapons'] }, // Cultural district with underground
            'Biscayne Bay': { services: [] }
        },
        'Detroit': {
            'Detroit Airport': { services: [] },
            'Corktown': { services: ['weapons'] }, // Industrial/rough area
            'Greektown': { services: ['clothes'] }, // Commercial district
            'Belle Isle': { services: ['bank'] } // Scenic area with upscale services
        },
        'Boston': {
            'Logan Airport': { services: [] },
            'Back Bay': { services: ['bank', 'clothes'] }, // Upscale area
            'North End': { services: ['weapons'] }, // Historic but with underground
            'Fenway': { services: [] }
        }
    },
    currentPrices: {},
    previousPrices: {},
    priceHistory: {}, // Track day-wise price history for graphs
    gameRunning: false,
    gameOver: false
};

// Navigation state
let navigationState = {
    isNavigating: false,
    currentMode: 'normal', // 'normal', 'market', 'inventory', 'travel', 'quantity', 'charts', 'history'
    selectedIndex: 0,
    selectedItem: null,
    quantity: 1,
    actionType: null // 'buy', 'sell', 'travel', 'charts', 'history'
};

// Game characters with fun spin-off names
const gameCharacters = {
    // Law enforcement
    officers: [
        { name: 'Officer Hardnose', emoji: '👮', type: 'tough' },
        { name: 'Deputy Donut', emoji: '🍩', type: 'corrupt' },
        { name: 'Detective Persistent', emoji: '🔍', type: 'smart' },
        { name: 'Sergeant Brawny', emoji: '💪', type: 'strong' },
        { name: 'Captain Straightlace', emoji: '🎖️', type: 'by_the_book' }
    ],
    
    // Criminals and dealers
    dealers: [
        { name: 'Slick Eddie', emoji: '🕴️', type: 'smooth' },
        { name: 'Big Tony', emoji: '🤵', type: 'intimidating' },
        { name: 'Sneaky Pete', emoji: '🥷', type: 'shifty' },
        { name: 'Mad Dog Mike', emoji: '🐕', type: 'aggressive' },
        { name: 'Whisper Wilson', emoji: '🤫', type: 'secretive' }
    ],
    
    // Street characters
    informants: [
        { name: 'Chatty Charlie', emoji: '🗣️', type: 'talkative' },
        { name: 'Nervous Nelly', emoji: '😰', type: 'anxious' },
        { name: 'Wise Willie', emoji: '🧠', type: 'knowledgeable' },
        { name: 'Shifty Sam', emoji: '👁️', type: 'suspicious' }
    ],
    
    // Loan sharks and money people
    loanSharks: [
        { name: 'Vinny "The Vise"', emoji: '🔧', type: 'pressure' },
        { name: 'Bones McGillicuddy', emoji: '💀', type: 'threatening' },
        { name: 'Sal "Interest" Soprano', emoji: '💰', type: 'greedy' },
        { name: 'Tommy "Two-Percent"', emoji: '📈', type: 'calculating' }
    ],
    
    // Doctors and medical
    doctors: [
        { name: 'Dr. Feelgood', emoji: '👨‍⚕️', type: 'helpful' },
        { name: 'Doc Patchup', emoji: '🩺', type: 'quick' },
        { name: 'Nurse Painkiller', emoji: '💊', type: 'medicated' },
        { name: 'Surgeon Steady', emoji: '🔬', type: 'precise' }
    ],
    
    // Vendors and merchants
    vendors: [
        { name: 'Merchant Mary', emoji: '🛒', type: 'business' },
        { name: 'Trader Tom', emoji: '🤝', type: 'friendly' },
        { name: 'Bargain Betty', emoji: '🏷️', type: 'cheap' },
        { name: 'Premium Paul', emoji: '💎', type: 'expensive' }
    ],
    
    // Weapon dealers
    weaponDealers: [
        { name: 'Gunsmith Gary', emoji: '🔫', type: 'professional' },
        { name: 'Crazy Eddie', emoji: '🤪', type: 'eccentric' },
        { name: 'Silent Sam', emoji: '🤫', type: 'discrete' },
        { name: 'Arms Anthony', emoji: '💪', type: 'intimidating' }
    ]
};

// Sound management - Authentic Dope Wars sounds
const sounds = {
    // Basic game sounds
    cashreg: new Audio('sound/cashreg.wav'),
    cophit: new Audio('sound/cophit.wav'),
    gun: new Audio('sound/gun.wav'),
    gun2: new Audio('sound/gun2.wav'),
    hrdpunch: new Audio('sound/hrdpunch.wav'),
    siren: new Audio('sound/Siren.wav'),
    uhoh: new Audio('sound/uhoh.wav'),
    wasted: new Audio('sound/wasted.wav'),
    youhit: new Audio('sound/youhit.wav'),
    
    // Additional authentic sounds
    actionfail: new Audio('sound/actionfail.wav'),
    airport: new Audio('sound/airport.wav'),
    charge: new Audio('sound/charge.wav'),
    clang: new Audio('sound/clang.wav'),
    dead: new Audio('sound/dead.wav'),
    doctor: new Audio('sound/doctor.wav'),
    gamenotification: new Audio('sound/gamenotification.wav'),
    ghost: new Audio('sound/ghost.wav'),
    headlines: new Audio('sound/headlines.wav'),
    lastday: new Audio('sound/lastday.wav'),
    mugged: new Audio('sound/mugged.wav'),
    policedog: new Audio('sound/policedog.wav'),
    slidein: new Audio('sound/slidein.wav'),
    slideout: new Audio('sound/slideout.wav'),
    star: new Audio('sound/star.wav'),
    touchsound: new Audio('sound/touchsound.wav'),
    
    // Loan shark sounds
    chainsaw: new Audio('sound/sharks/chainsaw.wav'),
    firstwarn: new Audio('sound/sharks/firstwarn.wav'),
    secwarn: new Audio('sound/sharks/secwarn.wav'),
    borrow: new Audio('sound/sharks/borrow.wav'),
    stairs: new Audio('sound/sharks/stairs.wav'),
    window: new Audio('sound/sharks/window.wav'),
    money: new Audio('sound/sharks/money.wav'),
    
    // Police chase sounds
    copchase: new Audio('sound/copchase/copchase.wav'),
    pistol: new Audio('sound/copchase/pistol.wav'),
    pistolhit: new Audio('sound/copchase/pistolhit.wav'),
    peashoot: new Audio('sound/copchase/peashoot.wav'),
    peashoothit: new Audio('sound/copchase/peashoothit.wav'),
    catapult: new Audio('sound/copchase/catapult.wav'),
    catapulthit: new Audio('sound/copchase/catapulthit.wav'),
    handbag: new Audio('sound/copchase/handbag.wav'),
    handbaghit: new Audio('sound/copchase/handbaghit.wav'),
    monkey: new Audio('sound/copchase/monkey.wav'),
    monkeyhit: new Audio('sound/copchase/monkeyhit.wav'),
    chicken: new Audio('sound/copchase/chicken.wav'),
    chickenhit: new Audio('sound/copchase/chickenhit.wav'),
    blank: new Audio('sound/copchase/blank.wav'),
    copmiss: new Audio('sound/copchase/copmiss.wav'),
    dump: new Audio('sound/copchase/dump.wav'),
    jaildoor: new Audio('sound/copchase/jaildoor.wav'),
    whew: new Audio('sound/copchase/whew.wav')
};

// Initialize audio elements
Object.keys(sounds).forEach(key => {
    sounds[key].volume = 0.3;
    sounds[key].preload = 'auto';
});

// Initialize available locations
function initializeLocations() {
    gameState.availableLocations = [];
    Object.keys(gameState.cities).forEach(city => {
        gameState.cities[city].forEach(district => {
            gameState.availableLocations.push(`${city} - ${district}`);
        });
    });
}

// Game initialization
function initGame() {
    gameState.gameRunning = true;
    gameState.gameOver = false;
    initializeLocations();
    generateMarketPrices();
    updateDisplay();
    
    // Command input removed - using clickable interface only
    
    // Add keyboard event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    addMessage('Game initialized. Type "help" for commands.', 'success');
    console.log('After game init, player cash:', gameState.player.cash);
}

// Input handling
// Command input disabled - using clickable interface only
function handleInput(e) {
    // Disabled for clickable interface
}

// Command processing disabled - using clickable interface only
function processCommand(command) {
    // Disabled for clickable interface
    addMessage('Command interface disabled. Use the clickable controls instead.', 'info');
}

// Help system
function showHelp() {
    const helpText = `
<div class="help-text">
<strong>PACKET PUSHERS COMMANDS:</strong><br>
• <strong>buy [drug] [amount]</strong> - Buy drugs (e.g., "buy cocaine 5", "buy specialk 3")<br>
• <strong>sell [drug] [amount]</strong> - Sell drugs (e.g., "sell weed 10", "sell molly 2")<br>
• <strong>travel [city]</strong> - Travel to a city (costs $${GAME_CONSTANTS.TRAVEL.INTERCITY_COST} and 1 day)<br>
• <strong>pay [amount]</strong> - Pay debt to loan shark<br>
• <strong>payoff</strong> - Pay off remaining debt completely<br>
• <strong>debt</strong> - Show debt management interface<br>
• <strong>deposit [amount]</strong> - Deposit cash into bank (secure from police)<br>
• <strong>withdraw [amount]</strong> - Withdraw money from bank<br>
• <strong>balance</strong> - Check your bank balance<br>
• <strong>bank</strong> - Show banking interface<br>
• <strong>status</strong> - Show detailed player status<br>
• <strong>inventory</strong> - Show your inventory<br>
• <strong>prices</strong> - Show current market prices<br>
• <strong>graph [drug]</strong> - Show price history graph for a drug<br>
• <strong>history [drug]</strong> - Show your purchase history (optional drug name)<br>
• <strong>cities</strong> - List available cities<br>
• <strong>weapons</strong> - Show available weapons for purchase<br>
• <strong>weapon buy [name]</strong> - Buy a weapon (e.g., "weapon buy pistol")<br>
• <strong>weapon sell</strong> - Sell your current weapon<br>
• <strong>weapon info</strong> - Show current weapon info<br>
• <strong>coat buy [name]</strong> - Buy a coat for more inventory space<br>
• <strong>coat sell</strong> - Sell your current coat<br>
• <strong>coat info</strong> - Show current coat info<br>
• <strong>shop</strong> - Show available shops in current location<br>
• <strong>shop weapons</strong> - Visit weapon shop<br>
• <strong>shop coats</strong> - Visit coat shop<br>
• <strong>menu</strong> - Open game menu (or press ESC)<br>
• <strong>save</strong> - Save current game<br>
• <strong>load</strong> - Load saved game<br>
• <strong>new</strong> - Start new game<br>
<br>
<strong>DRUG NAMES:</strong><br>
Use simple names in commands (emojis are just for display):<br>
• cocaine, coke • weed, marijuana, cannabis, pot • specialk, ketamine, k<br>
• molly, mdma • ice, meth • acid • hash • heroin • opium • crack<br>
• peyote • mushrooms, shrooms • speed, amphetamine<br>
<br>
<strong>KEYBOARD NAVIGATION:</strong><br>
• <strong>B</strong> - Enter buy mode (use arrow keys to select)<br>
• <strong>S</strong> - Enter sell mode (use arrow keys to select)<br>
• <strong>T</strong> - Enter travel mode (use arrow keys to select)<br>
• <strong>C</strong> - Enter charts mode (click drug to view chart)<br>
• <strong>H</strong> - Enter history mode (click inventory item to view history)<br>
• <strong>Enter</strong> - Confirm selection<br>
• <strong>Escape</strong> - Cancel navigation/Open menu<br>
• <strong>Arrow Keys</strong> - Navigate items/cities<br>
• <strong>+/-</strong> - Adjust quantity in buy/sell mode<br>
<br>
<strong>GOAL:</strong> Pay off your $${GAME_CONSTANTS.PLAYER.STARTING_DEBT} debt and maximize your net worth in ${GAME_CONSTANTS.PLAYER.MAX_DAYS} days!
</div>`;
    
    addMessage(helpText);
}

// Buy function
function handleBuy(parts) {
    if (parts.length < 3) {
        addMessage('Usage: buy [drug] [amount]', 'error');
        return;
    }
    
    const drugName = parts[1].toLowerCase();
    const amount = parseInt(parts[2]);
    
    if (isNaN(amount) || amount <= 0) {
        addMessage('Invalid amount. Please enter a positive number.', 'error');
        return;
    }
    
    // Find drug using enhanced matching
    const drug = findDrugByName(drugName);
    if (!drug) {
        addMessage(`Unknown drug: ${drugName}`, 'error');
        return;
    }
    
    const price = gameState.currentPrices[drug.name];
    
    // Validate price is a valid number and not zero
    if (!validatePrice(price, drug.name)) return;
    
    const totalCost = price * amount;
    
    // Check if player has enough cash
    if (gameState.player.cash < totalCost) {
        errorMessage(`💸 Not enough cash! You need $${totalCost} but only have $${gameState.player.cash}.`);
        console.log('Cash check failed:', { playerCash: gameState.player.cash, totalCost, price, amount, drugName: drug.name });
        return;
    }
    
    // Check inventory space
    if (!validateInventorySpace(amount, drug.name)) return;
    
    // Show confirmation dialog
    const confirmMessage = `Are you sure you want to buy ${amount} ${drug.name} for $${totalCost.toLocaleString()}?`;
    
    showConfirmationDialog(confirmMessage, () => {
        // Execute purchase
        gameState.player.cash -= totalCost;
        gameState.player.inventory[drug.name] = (gameState.player.inventory[drug.name] || 0) + amount;
        
        // Track purchase history for profit/loss calculations
        if (!gameState.player.purchaseHistory[drug.name]) {
            gameState.player.purchaseHistory[drug.name] = [];
        }
        gameState.player.purchaseHistory[drug.name].push({
            amount: amount,
            price: price,
            total: totalCost,
            day: gameState.player.day,
            location: gameState.player.location
        });
        
        NotificationSystem.cashSuccess(`💰 Bought ${amount} ${drug.name} for $${totalCost}!`);
        
        updateDisplay();
    });
}

// Find drug by name (with emoji-free matching)
function findDrugByName(searchName) {
    const lowerSearchName = searchName.toLowerCase();
    
    // Direct mapping for common variations
    const drugMappings = {
        'acid': '🧪 Acid',
        'cocaine': '❄️ Cocaine',
        'coke': '❄️ Cocaine',
        'hash': '🟫 Hash',
        'heroin': '💉 Heroin',
        'molly': '💊 Molly',
        'mdma': '💊 Molly',
        'ice': '🧊 Ice',
        'meth': '🧊 Ice',
        'opium': '🌺 Opium',
        'crack': '🪨 Crack',
        'peyote': '🌵 Peyote',
        'mushrooms': '🍄 Mushrooms',
        'shrooms': '🍄 Mushrooms',
        'speed': '⚡ Speed',
        'amphetamine': '⚡ Speed',
        'weed': '🌿 Weed',
        'marijuana': '🌿 Weed',
        'cannabis': '🌿 Weed',
        'pot': '🌿 Weed',
        'specialk': '🦄 Special K',
        'ketamine': '🦄 Special K',
        'k': '🦄 Special K'
    };
    
    // Check direct mapping first
    if (drugMappings[lowerSearchName]) {
        return gameState.drugs.find(d => d.name === drugMappings[lowerSearchName]);
    }
    
    // Fall back to existing matching logic
    return gameState.drugs.find(d => 
        d.name.toLowerCase() === lowerSearchName || 
        d.name.toLowerCase().includes(lowerSearchName) ||
        d.name.split(' ').slice(-1)[0].toLowerCase() === lowerSearchName
    );
}

// Show price graph help
function showPriceGraphHelp() {
    addMessage('='.repeat(50), 'info');
    addMessage('📊 PRICE GRAPH HELP', 'info');
    addMessage('='.repeat(50), 'info');
    addMessage('Usage: graph [drug name]', 'info');
    addMessage('Shows price history for a specific drug over time.', 'info');
    addMessage('Example: graph cocaine', 'info');
    addMessage('Example: graph specialk', 'info');
    addMessage('Example: graph weed', 'info');
    addMessage('='.repeat(50), 'info');
}

// Show price graph for a specific drug
function showPriceGraph(drugName) {
    const drug = findDrugByName(drugName);
    
    if (!drug) {
        addMessage(`❌ Unknown drug: ${drugName}`, 'error');
        return;
    }
    
    const history = gameState.priceHistory[drug.name];
    if (!history || history.length === 0) {
        addMessage(`📊 No price history available for ${drug.name}`, 'error');
        return;
    }
    
    addMessage('='.repeat(60), 'info');
    addMessage(`📊 PRICE HISTORY FOR ${drug.name}`, 'info');
    addMessage('='.repeat(60), 'info');
    
    // Find min and max prices for scaling
    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    // Display the graph
    history.forEach((entry, index) => {
        const day = entry.day;
        const price = entry.price;
        const location = getCityAbbreviation(entry.location.split(' - ')[0]);
        
        // Create a simple ASCII bar chart
        const barLength = priceRange > 0 ? Math.floor((price - minPrice) / priceRange * 20) : 10;
        const bar = '█'.repeat(Math.max(1, barLength));
        
        // Show trend indicator
        let trend = '';
        if (index > 0) {
            const previousPrice = history[index - 1].price;
            if (price > previousPrice) {
                trend = '↗️';
            } else if (price < previousPrice) {
                trend = '↘️';
            } else {
                trend = '→';
            }
        }
        
        addMessage(`Day ${day.toString().padStart(2)}: $${price.toString().padStart(6)} ${bar} ${trend} (${location})`, 'info');
    });
    
    addMessage('='.repeat(60), 'info');
    addMessage(`💰 Current Price: $${gameState.currentPrices[drug.name]}`, 'info');
    addMessage(`📈 Highest: $${maxPrice} | 📉 Lowest: $${minPrice}`, 'info');
    addMessage('='.repeat(60), 'info');
}

// Calculate average buy price from purchase history
function getAverageBuyPrice(drugName) {
    const history = gameState.player.purchaseHistory[drugName];
    if (!history || history.length === 0) {
        return null;
    }
    
    let totalCost = 0;
    let totalAmount = 0;
    
    for (const purchase of history) {
        totalCost += purchase.total;
        totalAmount += purchase.amount;
    }
    
    return totalAmount > 0 ? totalCost / totalAmount : null;
}

// Show purchase history for all drugs
function showAllPurchaseHistory() {
    const history = gameState.player.purchaseHistory;
    const drugs = Object.keys(history);
    
    if (drugs.length === 0) {
        addMessage('📋 No purchase history available. Start buying some drugs!', 'info');
        return;
    }
    
    addMessage('='.repeat(60), 'info');
    addMessage('📋 PURCHASE HISTORY SUMMARY', 'info');
    addMessage('='.repeat(60), 'info');
    
    drugs.forEach(drugName => {
        const drugHistory = history[drugName];
        const totalPurchases = drugHistory.length;
        const totalAmount = drugHistory.reduce((sum, p) => sum + p.amount, 0);
        const totalCost = drugHistory.reduce((sum, p) => sum + p.total, 0);
        const avgPrice = totalCost / totalAmount;
        
        addMessage(`${drugName}: ${totalPurchases} purchases, ${totalAmount} units, avg $${avgPrice.toFixed(2)}`, 'info');
    });
    
    addMessage('='.repeat(60), 'info');
    addMessage('Use "history [drug]" for detailed history (e.g., "history cocaine")', 'info');
    addMessage('='.repeat(60), 'info');
}

// Show purchase history for a specific drug
function showPurchaseHistory(drugName) {
    const drug = findDrugByName(drugName);
    if (!drug) {
        addMessage(`❌ Unknown drug: ${drugName}`, 'error');
        return;
    }
    
    const history = gameState.player.purchaseHistory[drug.name];
    if (!history || history.length === 0) {
        addMessage(`📋 No purchase history for ${drug.name}`, 'info');
        return;
    }
    
    addMessage('='.repeat(60), 'info');
    addMessage(`📋 PURCHASE HISTORY: ${drug.name}`, 'info');
    addMessage('='.repeat(60), 'info');
    
    let totalAmount = 0;
    let totalCost = 0;
    
    history.forEach((purchase, index) => {
        const location = getCityAbbreviation(purchase.location.split(' - ')[0]);
        totalAmount += purchase.amount;
        totalCost += purchase.total;
        
        addMessage(`#${index + 1}: Day ${purchase.day} - ${purchase.amount} units @ $${purchase.price} = $${purchase.total} (${location})`, 'info');
    });
    
    const avgPrice = totalCost / totalAmount;
    const currentPrice = gameState.currentPrices[drug.name];
    const currentInventory = gameState.player.inventory[drug.name] || 0;
    
    addMessage('='.repeat(60), 'info');
    addMessage(`💰 Total purchased: ${totalAmount} units for $${totalCost}`, 'info');
    addMessage(`📊 Average buy price: $${avgPrice.toFixed(2)}`, 'info');
    addMessage(`📈 Current market price: $${currentPrice}`, 'info');
    addMessage(`🎒 Current inventory: ${currentInventory} units`, 'info');
    
    if (currentInventory > 0) {
        const potentialSale = currentPrice * currentInventory;
        const potentialProfit = potentialSale - (avgPrice * currentInventory);
        const profitText = potentialProfit >= 0 ? `profit of $${potentialProfit.toFixed(2)}` : `loss of $${Math.abs(potentialProfit).toFixed(2)}`;
        addMessage(`💡 If sold now: $${potentialSale} (${profitText})`, 'info');
    }
    
    addMessage('='.repeat(60), 'info');
}

// Sell function
function handleSell(parts) {
    if (parts.length < 3) {
        addMessage('Usage: sell [drug] [amount]', 'error');
        return;
    }
    
    const drugName = parts[1].toLowerCase();
    const amount = parseInt(parts[2]);
    
    if (isNaN(amount) || amount <= 0) {
        addMessage('Invalid amount. Please enter a positive number.', 'error');
        return;
    }
    
    // Find drug using enhanced matching
    const drug = findDrugByName(drugName);
    if (!drug) {
        addMessage(`Unknown drug: ${drugName}`, 'error');
        return;
    }
    
    // Check if player has enough in inventory
    const currentAmount = gameState.player.inventory[drug.name] || 0;
    if (currentAmount < amount) {
        addMessage(`You only have ${currentAmount} ${drug.name} in your inventory.`, 'error');
        playSound('uhoh');
        return;
    }
    
    const price = gameState.currentPrices[drug.name];
    
    // Validate price is a valid number and not zero
    if (!validatePrice(price, drug.name)) return;
    
    const totalEarned = price * amount;
    
    // Get average buy price for profit/loss calculation
    const avgBuyPrice = getAverageBuyPrice(drug.name);
    let profitLossMessage = '';
    
    if (avgBuyPrice !== null) {
        const profitPerUnit = price - avgBuyPrice;
        const totalProfit = profitPerUnit * amount;
        const profitLossText = totalProfit >= 0 ? `profit of $${totalProfit.toFixed(2)}` : `loss of $${Math.abs(totalProfit).toFixed(2)}`;
        profitLossMessage = ` (Avg buy: $${avgBuyPrice.toFixed(2)}, ${profitLossText})`;
    }
    
    // Execute sale
    gameState.player.cash += totalEarned;
    gameState.player.inventory[drug.name] -= amount;
    
    if (gameState.player.inventory[drug.name] === 0) {
        delete gameState.player.inventory[drug.name];
    }
    
    NotificationSystem.cashSuccess(`💸 Sold ${amount} ${drug.name} for $${totalEarned}!${profitLossMessage}`);
    
    updateDisplay();
}

// Travel function
function handleTravel(parts) {
    if (parts.length < 2) {
        addMessage('Usage: travel [location/city name]', 'error');
        return;
    }
    
    const destination = parts.slice(1).join(' ');
    const currentLocation = gameState.player.location;
    const [currentCity, currentDistrict] = currentLocation.split(' - ');
    
    // Check if it's a local district or another city
    const isLocalDistrict = gameState.cities[currentCity] && 
                           gameState.cities[currentCity].some(district => 
                               district.toLowerCase() === destination.toLowerCase()
                           );
    
    if (isLocalDistrict) {
        // Local travel within city
        const targetDistrict = gameState.cities[currentCity].find(district => 
            district.toLowerCase() === destination.toLowerCase()
        );
        
        if (targetDistrict === currentDistrict) {
            addMessage(`You are already in ${targetDistrict}.`, 'error');
            return;
        }
        
        // Free local travel (just costs time)
        gameState.player.location = `${currentCity} - ${targetDistrict}`;
        gameState.player.day++;
        
        // Apply daily interest
        applyDailyInterest();
        
        addMessage(`🚶 Traveled to ${targetDistrict} within ${getCityAbbreviation(currentCity)}. (Free local travel)`, 'success');
        playSound('slidein'); // Local travel sound
        
    } else {
        // Inter-city travel
        const targetCity = Object.keys(gameState.cities).find(city => 
            city.toLowerCase() === destination.toLowerCase()
        );
        
        if (!targetCity) {
            addMessage(`Unknown location: ${destination}. Type "cities" to see available locations.`, 'error');
            return;
        }
        
        if (targetCity === currentCity) {
            addMessage(`You are already in ${targetCity}.`, 'error');
            return;
        }
        
        // Check if player is at an airport for inter-city travel
        const isAtAirport = currentDistrict.toLowerCase().includes('airport');
        if (!isAtAirport) {
            addMessage(`You must be at an airport to travel between cities. Go to an airport first.`, 'error');
            playSound('uhoh');
            return;
        }
        
        const travelCost = GAME_CONSTANTS.TRAVEL.INTERCITY_COST; // Inter-city travel cost
        if (gameState.player.cash < travelCost) {
            addMessage(`Not enough cash for inter-city travel. You need $${travelCost}.`, 'error');
            playSound('uhoh');
            return;
        }
        
        // Execute inter-city travel - land at airport
        const airportDistrict = gameState.cities[targetCity][0]; // First district is always airport
        gameState.player.cash -= travelCost;
        gameState.player.location = `${targetCity} - ${airportDistrict}`;
        gameState.player.day++;
        
        // Apply daily interest
        applyDailyInterest();
        
        addMessage(`✈️ Flew to ${getCityAbbreviation(targetCity)} and landed at ${airportDistrict} for $${travelCost}!`, 'success');
        playSound('airport'); // Flight sound
    }
    
    // Check if game is over
    if (gameState.player.day > gameState.player.maxDays) {
        endGame();
        return;
    }
    
    // Apply daily interest
    const dailyInterest = Math.floor(gameState.player.debt * GAME_CONSTANTS.TRAVEL.DAILY_INTEREST_RATE);
    gameState.player.debt += dailyInterest;
    
    // Track if headlines sound has been played this day
    let headlinesSoundPlayed = false;
    
    addMessage(`Daily interest of $${dailyInterest} added to your debt.`, 'event');
    if (dailyInterest > 0) {
        playSound('headlines'); // Headlines sound for daily interest
        headlinesSoundPlayed = true;
    }
    
    // Last day warning
    if (gameState.player.day === gameState.player.maxDays) {
        addMessage('⚠️ THIS IS YOUR LAST DAY! Make it count!', 'error');
        playSound('lastday'); // Last day warning sound
    }
    
    // Generate new prices
    generateMarketPrices();
    
    // Random event - pass flag to prevent sound overlap
    triggerRandomEvent(headlinesSoundPlayed);
    
    updateDisplay();
}

// Pay debt function
function handlePayDebt(parts) {
    if (parts.length < 2) {
        addMessage('Usage: pay [amount]', 'error');
        return;
    }
    
    const amount = parseInt(parts[1]);
    
    if (isNaN(amount) || amount <= 0) {
        addMessage('Invalid amount. Please enter a positive number.', 'error');
        return;
    }
    
    if (gameState.player.cash < amount) {
        addMessage(`Not enough cash. You only have $${gameState.player.cash}.`, 'error');
        playSound('uhoh');
        return;
    }
    
    const actualPayment = Math.min(amount, gameState.player.debt);
    gameState.player.cash -= actualPayment;
    gameState.player.debt -= actualPayment;
    
    // Record payment in debt history
    gameState.player.debtHistory = gameState.player.debtHistory || [];
    gameState.player.debtHistory.push({
        type: 'payment',
        amount: actualPayment,
        day: gameState.player.day,
        debtAfter: gameState.player.debt
    });
    
    addMessage(`💵 Paid $${actualPayment} to the loan shark!`, 'success');
    addMessage(`💰 Remaining debt: $${gameState.player.debt.toLocaleString()}`, 'event');
    playSound('cashreg');
    
    if (gameState.player.debt === 0) {
        addMessage('🎉 Congratulations! You have paid off your debt!', 'success');
    }
    
    updateDisplay();
}

// Banking functions
function handleDeposit(parts) {
    if (parts.length < 2) {
        addMessage('Usage: deposit [amount]', 'error');
        return;
    }
    
    // Check if current location has a bank
    if (!requireLocationService('bank', 'bank')) return;
    
    const amount = parseInt(parts[1]);
    
    if (isNaN(amount) || amount <= 0) {
        addMessage('Invalid amount. Please enter a positive number.', 'error');
        return;
    }
    
    if (gameState.player.cash < amount) {
        addMessage(`💸 Not enough cash. You only have $${gameState.player.cash}.`, 'error');
        playSound('uhoh');
        return;
    }
    
    gameState.player.cash -= amount;
    gameState.player.bankBalance = (gameState.player.bankBalance || 0) + amount;
    
    addMessage(`🏦 Deposited $${amount.toLocaleString()} into your account.`, 'success');
    addMessage(`💰 Account Balance: $${gameState.player.bankBalance.toLocaleString()}`, 'success');
    playSound('cashreg');
    
    updateDisplay();
}

function handleWithdraw(parts) {
    if (parts.length < 2) {
        addMessage('Usage: withdraw [amount]', 'error');
        return;
    }
    
    // Check if current location has a bank
    if (!requireLocationService('bank', 'bank')) return;
    
    const amount = parseInt(parts[1]);
    
    if (isNaN(amount) || amount <= 0) {
        addMessage('Invalid amount. Please enter a positive number.', 'error');
        return;
    }
    
    const bankBalance = gameState.player.bankBalance || 0;
    
    if (bankBalance < amount) {
        addMessage(`💸 Not enough funds in your account. You have $${bankBalance.toLocaleString()} available.`, 'error');
        playSound('uhoh');
        return;
    }
    
    gameState.player.cash += amount;
    gameState.player.bankBalance -= amount;
    
    addMessage(`🏦 Withdrew $${amount.toLocaleString()} from your account.`, 'success');
    addMessage(`💰 Account Balance: $${gameState.player.bankBalance.toLocaleString()}`, 'success');
    playSound('cashreg');
    
    updateDisplay();
}

function showBankBalance() {
    const bankBalance = gameState.player.bankBalance || 0;
    addMessage(`🏦 Your bank balance: $${bankBalance.toLocaleString()}`, 'success');
}

// Debt management functions
function showDebtManagement() {
    // Check if we're on mobile/desktop and show appropriate interface
    if (window.innerWidth <= 768) {
        showMobileDebtInterface();
    } else {
        showDesktopDebtInterface();
    }
}

function showMobileDebtInterface() {
    const debt = gameState.player.debt;
    const cash = gameState.player.cash;
    const initialDebt = gameState.player.initialDebt || GAME_CONSTANTS.PLAYER.STARTING_DEBT;
    const debtHistory = gameState.player.debtHistory || [];
    const daysRemaining = gameState.player.maxDays - gameState.player.day + 1;
    
    const modal = document.getElementById('mobileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = '💳 DEBT MANAGEMENT';
    
    // Calculate total payments made
    const totalPayments = debtHistory
        .filter(entry => entry.type === 'payment')
        .reduce((sum, entry) => sum + entry.amount, 0);
    
    // Calculate total interest accrued
    const totalInterest = debtHistory
        .filter(entry => entry.type === 'interest')
        .reduce((sum, entry) => sum + entry.amount, 0);
    
    // Calculate daily interest rate (5% per day)
    const dailyInterestRate = GAME_CONSTANTS.TRAVEL.DAILY_INTEREST_RATE;
    const dailyInterest = Math.floor(debt * dailyInterestRate);
    
    let debtHtml = `
        <div class="debt-interface">
            <div class="debt-status">
                <h3>Loan Shark Collections</h3>
                <p><strong>Current Debt:</strong> $${debt.toLocaleString()}</p>
                <p><strong>Cash Available:</strong> $${cash.toLocaleString()}</p>
                <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
                <p><strong>Daily Interest:</strong> $${dailyInterest.toLocaleString()} (5%)</p>
                ${debt > 0 ? `<p><em>Tomorrow's debt: $${Math.floor(debt * 1.05).toLocaleString()}</em></p>` : '<p><em>🎉 Debt-free!</em></p>'}
            </div>
            <div class="debt-actions">`;
    
    if (debt > 0 && cash > 0) {
        debtHtml += `
                <button class="mobile-item debt-action" onclick="showDebtPayment()">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">💸 Make Payment</div>
                        <div class="mobile-item-price">Pay toward debt</div>
                    </div>
                </button>`;
    }
    
    // Check if player can pay off completely
    const availableCash = cash + (gameState.player.bankBalance || 0);
    if (debt > 0 && availableCash >= debt) {
        debtHtml += `
                <button class="mobile-item debt-action" onclick="showDebtPayoff()">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">💰 Pay Off Debt</div>
                        <div class="mobile-item-price">Pay remaining $${debt.toLocaleString()}</div>
                    </div>
                </button>`;
    }
    
    debtHtml += `
                <button class="mobile-item debt-action" onclick="showDebtHistory()">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">📋 View History</div>
                        <div class="mobile-item-price">Recent activity</div>
                    </div>
                </button>
                <button class="mobile-item debt-action" onclick="showDebtDetails()">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">📊 Debt Details</div>
                        <div class="mobile-item-price">Full summary</div>
                    </div>
                </button>
            </div>
        </div>
    `;
    
    modalBody.innerHTML = debtHtml;
    modal.style.display = 'flex';
    playSound('touchsound');
}

function showDesktopDebtInterface() {
    const debt = gameState.player.debt;
    const cash = gameState.player.cash;
    const initialDebt = gameState.player.initialDebt || GAME_CONSTANTS.PLAYER.STARTING_DEBT;
    const debtHistory = gameState.player.debtHistory || [];
    const daysRemaining = gameState.player.maxDays - gameState.player.day + 1;
    
    // Calculate total payments made
    const totalPayments = debtHistory
        .filter(entry => entry.type === 'payment')
        .reduce((sum, entry) => sum + entry.amount, 0);
    
    // Calculate total interest accrued
    const totalInterest = debtHistory
        .filter(entry => entry.type === 'interest')
        .reduce((sum, entry) => sum + entry.amount, 0);
    
    // Calculate daily interest rate (5% per day)
    const dailyInterestRate = GAME_CONSTANTS.TRAVEL.DAILY_INTEREST_RATE;
    const dailyInterest = Math.floor(debt * dailyInterestRate);
    const totalAvailable = cash + (gameState.player.bankBalance || 0);
    const canPayOff = totalAvailable >= debt && debt > 0;
    
    const gameOutput = document.getElementById('gameOutput');
    gameOutput.innerHTML = `
        <div class="debt-interface">
            <div class="debt-header">
                <h3>💳 The Loan Shark's Debt Management System</h3>
                <div class="debt-status">
                    <p><strong>Current Debt:</strong> <span class="debt-amount">$${debt.toLocaleString()}</span></p>
                    <p><strong>Available Cash:</strong> $${cash.toLocaleString()}</p>
                    <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
                    <p><strong>Daily Interest:</strong> $${dailyInterest.toLocaleString()} (5% per day)</p>
                </div>
            </div>
            <div class="debt-summary">
                <h4>📊 Debt Summary</h4>
                <p>• Original Debt: $${initialDebt.toLocaleString()}</p>
                <p>• Total Payments Made: $${totalPayments.toLocaleString()}</p>
                <p>• Total Interest Accrued: $${totalInterest.toLocaleString()}</p>
                <p>• Tomorrow's Debt: $${Math.floor(debt * 1.05).toLocaleString()}</p>
                ${debt <= 0 ? '<p class="debt-free">🎉 Congratulations! You are debt-free!</p>' : ''}
            </div>
            <div class="debt-actions">
                <div class="desktop-actions">
                    <button class="desktop-btn" onclick="showDesktopDebtPayment()" ${cash <= 0 || debt <= 0 ? 'disabled' : ''}>
                        💰 Make Payment
                    </button>
                    ${canPayOff ? `<button class="desktop-btn" onclick="payOffDebtCompletely()">
                        💸 Pay Off Completely
                    </button>` : ''}
                    <button class="desktop-btn" onclick="showDesktopDebtDetails()">
                        📊 Details
                    </button>
                    <button class="desktop-btn" onclick="showDesktopDebtHistory()">
                        📋 History
                    </button>
                    <button class="desktop-btn" onclick="exitDebtInterface()">
                        🔙 Exit
                    </button>
                </div>
            </div>
            ${debt > 0 ? '<div class="debt-warning"><p>⚠️ WARNING: Your debt accumulates 5% interest daily!</p></div>' : ''}
        </div>
    `;
    playSound('touchsound');
}

// Debt management helper functions
function showDesktopDebtPayment() {
    const debt = gameState.player.debt;
    const cash = gameState.player.cash;
    const maxPayment = Math.min(debt, cash);
    
    if (maxPayment <= 0) {
        addMessage('You don\'t have any cash to make a payment!', 'error');
        playSound('uhoh');
        return;
    }
    
    const gameOutput = document.getElementById('gameOutput');
    gameOutput.innerHTML = `
        <div class="debt-interface">
            <div class="debt-header">
                <h3>💰 Make Debt Payment</h3>
                <div class="debt-status">
                    <p><strong>Current Debt:</strong> $${debt.toLocaleString()}</p>
                    <p><strong>Available Cash:</strong> $${cash.toLocaleString()}</p>
                    <p><strong>Maximum Payment:</strong> $${maxPayment.toLocaleString()}</p>
                </div>
            </div>
            <div class="banking-input">
                <input type="number" id="debtPaymentAmount" placeholder="Enter amount" min="1" max="${maxPayment}" class="amount-input">
                <div class="quick-amounts">
                    <button class="quick-btn" onclick="setDesktopDebtAmount(${Math.floor(maxPayment * 0.25)})">25%</button>
                    <button class="quick-btn" onclick="setDesktopDebtAmount(${Math.floor(maxPayment * 0.5)})">50%</button>
                    <button class="quick-btn" onclick="setDesktopDebtAmount(${Math.floor(maxPayment * 0.75)})">75%</button>
                    <button class="quick-btn" onclick="setDesktopDebtAmount(${maxPayment})">Max</button>
                </div>
                <div class="debt-actions">
                    <div class="desktop-actions">
                        <button class="desktop-btn" onclick="processDesktopDebtPayment()">
                            💰 Make Payment
                        </button>
                        <button class="desktop-btn" onclick="showDesktopDebtInterface()">
                            🔙 Back to Debt Management
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Focus on the input field
    setTimeout(() => {
        document.getElementById('debtPaymentAmount').focus();
    }, 100);
    
    playSound('touchsound');
}

function showDesktopDebtDetails() {
    const debt = gameState.player.debt;
    const initialDebt = gameState.player.initialDebt || GAME_CONSTANTS.PLAYER.STARTING_DEBT;
    const debtHistory = gameState.player.debtHistory || [];
    const totalPayments = debtHistory.filter(entry => entry.type === 'payment').reduce((sum, entry) => sum + entry.amount, 0);
    const totalInterest = debtHistory.filter(entry => entry.type === 'interest').reduce((sum, entry) => sum + entry.amount, 0);
    
    const gameOutput = document.getElementById('gameOutput');
    gameOutput.innerHTML = `
        <div class="debt-interface">
            <div class="debt-header">
                <h3>📊 Complete Debt Details</h3>
            </div>
            <div class="debt-details">
                <p><strong>Initial Debt:</strong> $${initialDebt.toLocaleString()}</p>
                <p><strong>Current Debt:</strong> $${debt.toLocaleString()}</p>
                <p><strong>Total Payments Made:</strong> $${totalPayments.toLocaleString()}</p>
                <p><strong>Total Interest Accrued:</strong> $${totalInterest.toLocaleString()}</p>
                <p><strong>Net Amount Paid:</strong> $${(totalPayments - (initialDebt - debt)).toLocaleString()}</p>
                <p><strong>Remaining Balance:</strong> $${debt.toLocaleString()}</p>
            </div>
            <div class="debt-actions">
                <div class="desktop-actions">
                    <button class="desktop-btn" onclick="showDesktopDebtInterface()">
                        🔙 Back to Debt Management
                    </button>
                </div>
            </div>
        </div>
    `;
    playSound('touchsound');
}

function showDesktopDebtHistory() {
    const debtHistory = gameState.player.debtHistory || [];
    
    const gameOutput = document.getElementById('gameOutput');
    let historyHtml = '';
    
    if (debtHistory.length === 0) {
        historyHtml = '<p>No debt history available.</p>';
    } else {
        historyHtml = debtHistory.slice().reverse().map(entry => {
            const date = `Day ${entry.day}`;
            if (entry.type === 'payment') {
                return `<p>${date}: Payment of $${entry.amount.toLocaleString()} - Debt: $${entry.debtAfter.toLocaleString()}</p>`;
            } else if (entry.type === 'interest') {
                return `<p>${date}: Interest charge $${entry.amount.toLocaleString()} - Debt: $${entry.debtAfter.toLocaleString()}</p>`;
            }
            return '';
        }).join('');
    }
    
    gameOutput.innerHTML = `
        <div class="debt-interface">
            <div class="debt-header">
                <h3>📋 Complete Debt History</h3>
            </div>
            <div class="debt-history">
                ${historyHtml}
            </div>
            <div class="debt-actions">
                <div class="desktop-actions">
                    <button class="desktop-btn" onclick="showDesktopDebtInterface()">
                        🔙 Back to Debt Management
                    </button>
                </div>
            </div>
        </div>
    `;
    playSound('touchsound');
}

function setDesktopDebtAmount(amount) {
    const input = document.getElementById('debtPaymentAmount');
    if (input) {
        input.value = amount;
    }
}

function processDesktopDebtPayment() {
    const amount = parseInt(document.getElementById('debtPaymentAmount').value);
    const debt = gameState.player.debt;
    const cash = gameState.player.cash;
    
    if (!amount || amount <= 0) {
        addMessage('Please enter a valid amount.', 'error');
        playSound('uhoh');
        return;
    }
    
    if (amount > cash) {
        addMessage('You don\'t have enough cash!', 'error');
        playSound('uhoh');
        return;
    }
    
    if (amount > debt) {
        addMessage('You can\'t pay more than your debt!', 'error');
        playSound('uhoh');
        return;
    }
    
    // Process the payment
    gameState.player.cash -= amount;
    gameState.player.debt -= amount;
    
    // Add to debt history
    const debtHistory = gameState.player.debtHistory || [];
    debtHistory.push({
        type: 'payment',
        amount: amount,
        day: gameState.player.day,
        debtAfter: gameState.player.debt
    });
    gameState.player.debtHistory = debtHistory;
    
    addMessage(`💰 Payment of $${amount.toLocaleString()} applied to debt!`, 'success');
    if (gameState.player.debt <= 0) {
        addMessage('🎉 Congratulations! You are now debt-free!', 'success');
    }
    
    updateDisplay();
    playSound('cashreg');
    
    // Show updated debt interface
    setTimeout(() => {
        showDesktopDebtInterface();
    }, 1000);
}

function payOffDebtCompletely() {
    const debt = gameState.player.debt;
    const cash = gameState.player.cash;
    const bankBalance = gameState.player.bankBalance || 0;
    const totalAvailable = cash + bankBalance;
    
    if (totalAvailable < debt) {
        addMessage('You don\'t have enough funds to pay off your debt completely!', 'error');
        playSound('uhoh');
        return;
    }
    
    // Use cash first, then bank balance
    let remainingDebt = debt;
    let cashUsed = Math.min(cash, remainingDebt);
    remainingDebt -= cashUsed;
    let bankUsed = remainingDebt;
    
    gameState.player.cash -= cashUsed;
    gameState.player.bankBalance = (gameState.player.bankBalance || 0) - bankUsed;
    gameState.player.debt = 0;
    
    // Add to debt history
    const debtHistory = gameState.player.debtHistory || [];
    debtHistory.push({
        type: 'payment',
        amount: debt,
        day: gameState.player.day,
        debtAfter: 0
    });
    gameState.player.debtHistory = debtHistory;
    
    addMessage(`🎉 DEBT PAID OFF! You paid $${debt.toLocaleString()} and are now debt-free!`, 'success');
    if (bankUsed > 0) {
        addMessage(`Used $${cashUsed.toLocaleString()} cash and $${bankUsed.toLocaleString()} from bank.`, 'info');
    }
    
    updateDisplay();
    playSound('cashreg');
    
    // Show updated debt interface
    setTimeout(() => {
        showDesktopDebtInterface();
    }, 1000);
}

function exitDebtInterface() {
    const gameOutput = document.getElementById('gameOutput');
    gameOutput.innerHTML = `
        <div class="welcome-message">
            <p>Welcome to Packet Pushers!</p>
            <p>You owe the loan shark $${gameState.player.debt.toLocaleString()} with daily interest.</p>
            <p>You have ${gameState.player.maxDays - gameState.player.day + 1} days remaining.</p>
            <p>Use the controls to navigate the market.</p>
        </div>
    `;
    playSound('touchsound');
}

function showDebtPayment() {
    const debt = gameState.player.debt;
    const cash = gameState.player.cash;
    const maxPayment = Math.min(debt, cash);
    showFinancialInput('💸 MAKE PAYMENT', 'payment', maxPayment, debt, cash, 'Pay toward debt');
}

function showDebtPayoff() {
    const debt = gameState.player.debt;
    showFinancialConfirmation('💰 PAY OFF DEBT', `Pay off remaining debt of $${debt.toLocaleString()}?`, 'processDebtPayoff');
}

function showDebtHistory() {
    const debtHistory = gameState.player.debtHistory || [];
    let content = '<h3>Recent Debt Activity</h3>';
    if (debtHistory.length === 0) {
        content += '<p>No debt activity yet.</p>';
    } else {
        debtHistory.slice(-10).reverse().forEach(entry => {
            const date = `Day ${entry.day}`;
            if (entry.type === 'payment') {
                content += `<p><strong>${date}:</strong> Payment of $${entry.amount.toLocaleString()} - Debt: $${entry.debtAfter.toLocaleString()}</p>`;
            } else if (entry.type === 'interest') {
                content += `<p><strong>${date}:</strong> Interest charge $${entry.amount.toLocaleString()} - Debt: $${entry.debtAfter.toLocaleString()}</p>`;
            }
        });
    }
    showFinancialInfo('📋 DEBT HISTORY', content, 'showMobileDebtInterface');
}

function showDebtDetails() {
    const debt = gameState.player.debt;
    const initialDebt = gameState.player.initialDebt || GAME_CONSTANTS.PLAYER.STARTING_DEBT;
    const debtHistory = gameState.player.debtHistory || [];
    const daysRemaining = gameState.player.maxDays - gameState.player.day + 1;
    
    const totalPayments = debtHistory.filter(entry => entry.type === 'payment').reduce((sum, entry) => sum + entry.amount, 0);
    const totalInterest = debtHistory.filter(entry => entry.type === 'interest').reduce((sum, entry) => sum + entry.amount, 0);
    
    const content = `
        <h3>Complete Debt Summary</h3>
        <p><strong>Initial Debt:</strong> $${initialDebt.toLocaleString()}</p>
        <p><strong>Current Debt:</strong> $${debt.toLocaleString()}</p>
        <p><strong>Total Payments:</strong> $${totalPayments.toLocaleString()}</p>
        <p><strong>Total Interest:</strong> $${totalInterest.toLocaleString()}</p>
        <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
        <p><strong>Daily Interest Rate:</strong> 5%</p>
        ${debt > 0 ? `<p><strong>Tomorrow's Debt:</strong> $${Math.floor(debt * 1.05).toLocaleString()}</p>` : '<p><strong>Status:</strong> 🎉 Debt-free!</p>'}
    `;
    showFinancialInfo('📊 DEBT DETAILS', content, 'showMobileDebtInterface');
}

function setDebtPaymentAmount(amount) {
    document.getElementById('debtPaymentAmount').value = amount;
}

function processDebtPayment() {
    const amount = parseInt(document.getElementById('debtPaymentAmount').value);
    if (!amount || amount <= 0) return addMessage('Please enter a valid amount.', 'error');
    if (amount > gameState.player.cash) return addMessage('You don\'t have enough cash!', 'error');
    if (amount > gameState.player.debt) return addMessage('You can\'t pay more than your debt!', 'error');
    
    gameState.player.cash -= amount;
    gameState.player.debt -= amount;
    
    if (!gameState.player.debtHistory) gameState.player.debtHistory = [];
    gameState.player.debtHistory.push({
        day: gameState.player.day,
        type: 'payment',
        amount: amount,
        debtAfter: gameState.player.debt
    });
    
    addMessage(`💸 Made a payment of $${amount.toLocaleString()} toward your debt.`, 'success');
    addMessage(`💰 Remaining debt: $${gameState.player.debt.toLocaleString()}`, gameState.player.debt > 0 ? 'event' : 'success');
    
    if (gameState.player.debt === 0) {
        addMessage('🎉 Congratulations! You are now debt-free!', 'success');
        playSound('win');
    } else {
        playSound('cashreg');
    }
    
    updateDisplay();
    closeMobileModal();
}

function processDebtPayoff() {
    const debt = gameState.player.debt;
    const availableCash = gameState.player.cash + (gameState.player.bankBalance || 0);
    
    if (debt === 0) return addMessage('🎉 You already have no debt!', 'success');
    if (availableCash < debt) return addMessage(`💸 Not enough money to pay off debt.`, 'error');
    
    let remainingDebt = debt;
    let usedCash = Math.min(gameState.player.cash, remainingDebt);
    let usedBank = remainingDebt - usedCash;
    
    gameState.player.cash -= usedCash;
    if (usedBank > 0) gameState.player.bankBalance -= usedBank;
    gameState.player.debt = 0;
    
    if (!gameState.player.debtHistory) gameState.player.debtHistory = [];
    gameState.player.debtHistory.push({
        day: gameState.player.day,
        type: 'payment',
        amount: debt,
        debtAfter: 0
    });
    
    addMessage(`💰 Paid off your entire debt of $${debt.toLocaleString()}!`, 'success');
    addMessage(`💸 Used $${usedCash.toLocaleString()} cash${usedBank > 0 ? ` and $${usedBank.toLocaleString()} from bank` : ''}.`, 'success');
    addMessage('🎉 Congratulations! You are now debt-free!', 'success');
    playSound('win');
    
    updateDisplay();
    closeMobileModal();
}

// Reusable financial interface functions
function showFinancialInput(title, type, maxAmount, contextValue, availableAmount, description) {
    const modal = document.getElementById('mobileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = title;
    
    if (maxAmount <= 0) {
        modalBody.innerHTML = `
            <div class="debt-interface">
                <div class="debt-status">
                    <h3>Unable to ${type}</h3>
                    <p>${type === 'payment' ? 'You have no cash to make a payment!' : 'No funds available.'}</p>
                </div>
                <div class="debt-actions">
                    <button class="mobile-item debt-action" onclick="${type === 'payment' ? 'showMobileDebtInterface' : 'showMobileBankInterface'}()">
                        <div class="mobile-item-info">
                            <div class="mobile-item-name">🔙 Back</div>
                        </div>
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    modalBody.innerHTML = `
        <div class="debt-interface">
            <div class="debt-status">
                <h3>${title.replace(/^.*\s/, '')}</h3>
                <p><strong>Available:</strong> $${maxAmount.toLocaleString()}</p>
                <p>${description}</p>
            </div>
            <div class="banking-input">
                <input type="number" id="debtPaymentAmount" placeholder="Enter amount" min="1" max="${maxAmount}">
                <div class="debt-quick-amounts">
                    <button class="debt-quick-amount" onclick="setDebtPaymentAmount(${Math.floor(maxAmount * 0.25)})">25%</button>
                    <button class="debt-quick-amount" onclick="setDebtPaymentAmount(${Math.floor(maxAmount * 0.5)})">50%</button>
                    <button class="debt-quick-amount" onclick="setDebtPaymentAmount(${Math.floor(maxAmount * 0.75)})">75%</button>
                    <button class="debt-quick-amount" onclick="setDebtPaymentAmount(${maxAmount})">Max</button>
                </div>
            </div>
            <div class="debt-actions">
                <button class="mobile-item debt-action" onclick="processDebtPayment()">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">✓ Confirm</div>
                    </div>
                </button>
                <button class="mobile-item debt-action" onclick="showMobileDebtInterface()">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">🔙 Back</div>
                    </div>
                </button>
            </div>
        </div>
    `;
}

function showFinancialConfirmation(title, message, action) {
    const modal = document.getElementById('mobileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = `
        <div class="debt-interface">
            <div class="debt-status">
                <h3>${title.replace(/^.*\s/, '')}</h3>
                <p>${message}</p>
            </div>
            <div class="debt-actions">
                <button class="mobile-item debt-action" onclick="${action}()">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">✓ Confirm</div>
                    </div>
                </button>
                <button class="mobile-item debt-action" onclick="showMobileDebtInterface()">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">🔙 Cancel</div>
                    </div>
                </button>
            </div>
        </div>
    `;
}

function showFinancialInfo(title, content, backAction) {
    const modal = document.getElementById('mobileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = `
        <div class="debt-interface">
            <div class="debt-status">
                ${content}
            </div>
            <div class="debt-actions">
                <button class="mobile-item debt-action" onclick="${backAction}()">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">🔙 Back</div>
                    </div>
                </button>
            </div>
        </div>
    `;
}

function handlePayoffDebt() {
    const debt = gameState.player.debt;
    const availableCash = gameState.player.cash + (gameState.player.bankBalance || 0);
    
    if (debt === 0) {
        addMessage('🎉 You already have no debt!', 'success');
        return;
    }
    
    if (availableCash < debt) {
        addMessage(`💸 Not enough money to pay off debt. You need $${debt.toLocaleString()} but only have $${availableCash.toLocaleString()} total.`, 'error');
        addMessage('💡 Try using cash and bank balance combined, or earn more money first.', 'event');
        return;
    }
    
    // Use cash first, then bank balance
    let remaining = debt;
    let cashUsed = Math.min(gameState.player.cash, remaining);
    remaining -= cashUsed;
    let bankUsed = remaining;
    
    // Update balances
    gameState.player.cash -= cashUsed;
    gameState.player.bankBalance = (gameState.player.bankBalance || 0) - bankUsed;
    
    // Record payment in debt history
    gameState.player.debtHistory = gameState.player.debtHistory || [];
    gameState.player.debtHistory.push({
        type: 'payment',
        amount: debt,
        day: gameState.player.day,
        debtAfter: 0
    });
    
    gameState.player.debt = 0;
    
    addMessage(`🎉 DEBT PAID OFF! You've eliminated your entire debt of $${debt.toLocaleString()}!`, 'success');
    if (cashUsed > 0) {
        addMessage(`💰 Used $${cashUsed.toLocaleString()} from cash`, 'success');
    }
    if (bankUsed > 0) {
        addMessage(`🏦 Used $${bankUsed.toLocaleString()} from bank balance`, 'success');
    }
    addMessage('🌟 You are now debt-free! Focus on building your empire!', 'success');
    
    playSound('cashreg');
    updateDisplay();
}

// Apply daily interest to debt
function applyDailyInterest() {
    if (gameState.player.debt > 0) {
        const dailyInterestRate = GAME_CONSTANTS.TRAVEL.DAILY_INTEREST_RATE; // 5% daily interest
        const interestAmount = Math.floor(gameState.player.debt * dailyInterestRate);
        
        if (interestAmount > 0) {
            gameState.player.debt += interestAmount;
            
            // Record interest charge in debt history
            gameState.player.debtHistory = gameState.player.debtHistory || [];
            gameState.player.debtHistory.push({
                type: 'interest',
                amount: interestAmount,
                day: gameState.player.day,
                debtAfter: gameState.player.debt
            });
            
            addMessage(`💸 Daily interest: $${interestAmount.toLocaleString()} added to debt (5% daily rate)`, 'error');
            addMessage(`💰 Total debt is now: $${gameState.player.debt.toLocaleString()}`, 'error');
        }
    }
}

// Status display
function showStatus() {
    const netWorth = calculateNetWorth();
    const inventorySize = getCurrentInventorySize();
    
    const statusText = `
<div class="help-text">
<strong>PLAYER STATUS:</strong><br>
Name: ${gameState.player.name || 'Anonymous Dealer'}<br>
Cash: $${gameState.player.cash}<br>
Bank: $${gameState.player.bankBalance || 0}<br>
Debt: $${gameState.player.debt}<br>
Net Worth: $${netWorth}<br>
Location: ${formatLocationDisplay(gameState.player.location)}<br>
Day: ${gameState.player.day} / ${gameState.player.maxDays}<br>
Inventory: ${inventorySize} / ${getCurrentMaxInventory()}<br>
Weapon: ${gameState.player.weapon ? `${gameState.player.weapon.name} (Damage: ${gameState.player.weapon.damage})` : 'None'}<br>
Coat: ${gameState.player.coat ? `${gameState.player.coat.name} (Capacity: ${gameState.player.coat.capacity})` : 'None'}
</div>`;
    
    addMessage(statusText);
}

// Inventory display
function showInventory() {
    const inventory = Object.keys(gameState.player.inventory);
    
    if (inventory.length === 0) {
        addMessage('Your inventory is empty.', 'event');
        return;
    }
    
    let inventoryText = '<div class="help-text"><strong>INVENTORY:</strong><br>';
    
    inventory.forEach(drug => {
        const amount = gameState.player.inventory[drug];
        const currentPrice = gameState.currentPrices[drug];
        const value = amount * currentPrice;
        inventoryText += `${drug}: ${amount} units (worth $${value})<br>`;
    });
    
    inventoryText += '</div>';
    addMessage(inventoryText);
}

// Weapon system functions
function showWeapons() {
    let weaponsText = '<div class="help-text"><strong>AVAILABLE WEAPONS:</strong><br>';
    
    gameState.weapons.forEach(weapon => {
        weaponsText += `${weapon.name}: $${weapon.price} (Damage: ${weapon.damage}) - ${weapon.description}<br>`;
    });
    
    weaponsText += '<br><strong>Usage:</strong> weapon buy &lt;name&gt; | weapon sell | weapon info</div>';
    addMessage(weaponsText);
}

function showCurrentWeapon() {
    if (gameState.player.weapon) {
        const weapon = gameState.player.weapon;
        addMessage(`🔫 Current weapon: ${weapon.name} (Damage: ${weapon.damage})`, 'success');
        addMessage(`${weapon.description}`, 'event');
    } else {
        addMessage('You have no weapon equipped.', 'event');
        addMessage('Use "weapon buy <name>" to purchase a weapon or "weapons" to see available weapons.', 'event');
    }
}

function handleWeaponCommand(parts) {
    const subCommand = parts[1].toLowerCase();
    
    switch (subCommand) {
        case 'buy':
            buyWeapon(parts);
            break;
        case 'sell':
            sellWeapon();
            break;
        case 'info':
            showCurrentWeapon();
            break;
        default:
            addMessage('Unknown weapon command. Use: weapon buy <name> | weapon sell | weapon info', 'error');
            break;
    }
}

function buyWeapon(parts) {
    if (parts.length < 3) {
        addMessage('Usage: weapon buy <weapon name>', 'error');
        return;
    }
    
    const weaponName = parts.slice(2).join(' ');
    const weapon = gameState.weapons.find(w => w.name.toLowerCase() === weaponName.toLowerCase());
    
    if (!weapon) {
        addMessage(`Weapon "${weaponName}" not found. Use "weapons" to see available weapons.`, 'error');
        return;
    }
    
    if (gameState.player.cash < weapon.price) {
        addMessage(`You don't have enough cash. ${weapon.name} costs $${weapon.price}.`, 'error');
        return;
    }
    
    // Check if current location has a weapon shop
    if (!requireLocationService('weapons', 'weapon shop')) return;
    
    // Random weapon dealer encounter
    const dealer = getRandomCharacter('weaponDealers');
    addMessage(`🔫 ${dealer.emoji} ${dealer.name} appears with weapons to sell!`, 'event');
    
    // Different dealer personalities affect the transaction
    let finalPrice = weapon.price;
    
    // Special Rubber Chicken reactions from weapon dealers
    if (weapon.name === 'Rubber Chicken') {
        if (dealer.type === 'eccentric') {
            finalPrice = Math.floor(weapon.price * 0.5); // 50% discount for the eccentric genius
            addMessage(`${dealer.name}: "Ah, a fellow connoisseur of unconventional warfare! The chicken is a masterpiece of psychological destruction!"`, 'event');
            addMessage(`${dealer.name}: "For someone who appreciates true artistry, only $${finalPrice}!"`, 'event');
        } else if (dealer.type === 'intimidating') {
            finalPrice = Math.floor(weapon.price * 1.5); // 50% markup - terrified of player's mental state
            addMessage(`${dealer.name}: "You want... THAT thing? Look, I don't know what you're planning, but I don't want to know."`, 'event');
            addMessage(`${dealer.name}: "$${finalPrice} and please don't tell anyone I sold this to you."`, 'event');
        } else {
            addMessage(`${dealer.name}: "The rubber chicken... I've heard legends. Are you sure you're ready for this kind of power?"`, 'event');
            addMessage(`${dealer.name}: "Standard rate for the legendary ${weapon.name}. $${finalPrice}."`, 'event');
        }
    } else {
        if (dealer.type === 'eccentric') {
            finalPrice = Math.floor(weapon.price * (0.8 + Math.random() * 0.4)); // 80-120% of original price
            addMessage(`${dealer.name}: "For you, special price! Only $${finalPrice}!"`, 'event');
        } else if (dealer.type === 'intimidating') {
            finalPrice = Math.floor(weapon.price * 1.2); // 20% markup
            addMessage(`${dealer.name}: "Quality weapons don't come cheap. $${finalPrice}, take it or leave it."`, 'event');
        } else {
            addMessage(`${dealer.name}: "Standard rate for the ${weapon.name}. $${finalPrice}."`, 'event');
        }
    }
    
    if (gameState.player.cash < finalPrice) {
        addMessage(`You don't have enough cash for the dealer's price of $${finalPrice}.`, 'error');
        return;
    }
    
    // If player already has a weapon, sell it for 50% of original price
    if (gameState.player.weapon) {
        const sellPrice = Math.floor(gameState.player.weapon.price * 0.5);
        addMessage(`${dealer.name}: "I'll take your old ${gameState.player.weapon.name} for $${sellPrice}."`, 'event');
        gameState.player.cash += sellPrice;
        playSound('cashreg');
    }
    
    gameState.player.cash -= finalPrice;
    gameState.player.weapon = { ...weapon };
    
    addMessage(`You bought ${weapon.name} for $${finalPrice}!`, 'success');
    playSound('cashreg');
    
    // Test fire the weapon
    setTimeout(() => {
        if (weapon.name === 'Rubber Chicken') {
            addMessage(`${dealer.name}: "Here, try it out... if you dare!"`, 'event');
            playSound(weapon.hitSound);
            addMessage(`*You squeeze the rubber chicken menacingly*`, 'event');
            addMessage(`${dealer.name}: "That sound... it chills me to the bone. Use it wisely."`, 'event');
        } else {
            addMessage(`${dealer.name}: "Here, try it out!"`, 'event');
            playSound(weapon.hitSound);
            addMessage(`*${weapon.name} fires*`, 'event');
        }
    }, 1000);
}

function sellWeapon() {
    if (!gameState.player.weapon) {
        addMessage('You have no weapon to sell.', 'error');
        return;
    }
    
    // Check if current location has a weapon shop
    if (!requireLocationService('weapons', 'weapon shop')) return;
    
    const dealer = getRandomCharacter('weaponDealers');
    const sellPrice = Math.floor(gameState.player.weapon.price * 0.5);
    
    addMessage(`🔫 ${dealer.emoji} ${dealer.name} examines your weapon.`, 'event');
    addMessage(`${dealer.name}: "Best I can do is $${sellPrice} for your ${gameState.player.weapon.name}."`, 'event');
    
    gameState.player.cash += sellPrice;
    addMessage(`You sold your ${gameState.player.weapon.name} for $${sellPrice}.`, 'success');
    gameState.player.weapon = null;
    
    playSound('cashreg');
}

// Coat system functions
function showCurrentCoat() {
    if (gameState.player.coat) {
        const coat = gameState.player.coat;
        addMessage(`🧥 Current coat: ${coat.name} (Capacity: ${coat.capacity})`, 'success');
        addMessage(`${coat.description}`, 'event');
    } else {
        addMessage('You have no coat equipped. Default inventory: 100 spaces.', 'event');
        addMessage('Use "shop coats" to visit a coat shop or "coat buy <name>" to purchase one.', 'event');
    }
}

function handleCoatCommand(parts) {
    const subCommand = parts[1].toLowerCase();
    
    switch (subCommand) {
        case 'buy':
            buyCoat(parts);
            break;
        case 'sell':
            sellCoat();
            break;
        case 'info':
            showCurrentCoat();
            break;
        default:
            addMessage('Unknown coat command. Use: coat buy <name> | coat sell | coat info', 'error');
            break;
    }
}

function buyCoat(parts) {
    if (parts.length < 3) {
        addMessage('Usage: coat buy <coat name>', 'error');
        return;
    }
    
    const coatName = parts.slice(2).join(' ');
    const coat = gameState.coats.find(c => c.name.toLowerCase() === coatName.toLowerCase());
    
    if (!coat) {
        addMessage(`Coat "${coatName}" not found. Use "shop coats" to see available coats.`, 'error');
        return;
    }
    
    if (gameState.player.cash < coat.price) {
        addMessage(`You don't have enough cash. ${coat.name} costs $${coat.price}.`, 'error');
        return;
    }
    
    // Check if current location has a coat shop
    if (!requireLocationService('clothes', 'coat shop')) return;
    
    // Check if player already has a coat - they can only own one
    if (gameState.player.coat) {
        addMessage(`You already have a ${gameState.player.coat.name}. You can only own one coat at a time. Sell your current coat first with "coat sell".`, 'error');
        return;
    }
    
    // Random coat dealer encounter
    const dealer = getRandomCharacter('vendors');
    addMessage(`🧥 ${dealer.emoji} ${dealer.name} runs the coat shop here!`, 'event');
    
    // Different dealer personalities affect the transaction
    let finalPrice = coat.price;
    if (dealer.type === 'cheap') {
        finalPrice = Math.floor(coat.price * 0.9); // 10% discount
        addMessage(`${dealer.name}: "I'll give you a deal on this quality ${coat.name}! Only $${finalPrice}!"`, 'event');
    } else if (dealer.type === 'expensive') {
        finalPrice = Math.floor(coat.price * 1.3); // 30% markup
        addMessage(`${dealer.name}: "This ${coat.name} is premium quality. $${finalPrice}."`, 'event');
    } else {
        addMessage(`${dealer.name}: "Nice choice! The ${coat.name} is $${finalPrice}."`, 'event');
    }
    
    if (gameState.player.cash < finalPrice) {
        addMessage(`You don't have enough cash for the dealer's price of $${finalPrice}.`, 'error');
        return;
    }
    
    // Player can only have one coat at a time (check already done above)
    
    gameState.player.cash -= finalPrice;
    gameState.player.coat = { ...coat };
    
    addMessage(`You bought ${coat.name} for $${finalPrice}! Inventory capacity: ${coat.capacity}`, 'success');
    playSound('cashreg');
    
    // Update display to reflect new inventory capacity
    updateDisplay();
}

function sellCoat() {
    if (!gameState.player.coat) {
        addMessage('You have no coat to sell.', 'error');
        return;
    }
    
    // Check if current location has a coat shop
    if (!requireLocationService('clothes', 'coat shop')) return;
    
    const dealer = getRandomCharacter('vendors');
    const sellPrice = Math.floor(gameState.player.coat.price * GAME_CONSTANTS.PRICING.COAT_SELL_MULTIPLIER);
    
    addMessage(`🧥 ${dealer.emoji} ${dealer.name} examines your coat.`, 'event');
    addMessage(`${dealer.name}: "I can give you $${sellPrice} for your ${gameState.player.coat.name}."`, 'event');
    
    gameState.player.cash += sellPrice;
    addMessage(`You sold your ${gameState.player.coat.name} for $${sellPrice}. Inventory back to ${GAME_CONSTANTS.PLAYER.BASE_INVENTORY} spaces.`, 'success');
    gameState.player.coat = null;
    
    playSound('cashreg');
    updateDisplay();
}

// Shop system functions
function showAvailableShops() {
    const location = gameState.player.location;
    const [city, district] = location.split(' - ');
    const locationData = gameState.locationServices[city] && gameState.locationServices[city][district];
    
    if (!locationData || !locationData.services || locationData.services.length === 0) {
        addMessage('No shops available in this location.', 'event');
        return;
    }
    
    let shopText = '<div class="help-text"><strong>AVAILABLE SERVICES:</strong><br>';
    
    if (locationData.services.includes('weapons')) {
        shopText += '🏪🔫 <strong>Weapon Shop</strong> - Use "shop weapons" to visit<br>';
    }
    
    if (locationData.services.includes('clothes')) {
        shopText += '🏪🧥 <strong>Coat Shop</strong> - Use "shop coats" to visit<br>';
    }
    
    if (locationData.services.includes('bank')) {
        shopText += '🏪🏦 <strong>Bank</strong> - Use "bank" or "deposit/withdraw" commands<br>';
    }
    
    shopText += '<br><strong>Commands:</strong> shop weapons | shop coats | bank</div>';
    addMessage(shopText);
}

function handleShopCommand(parts) {
    const shopType = parts[1].toLowerCase();
    
    switch (shopType) {
        case 'weapons':
            visitWeaponShop();
            break;
        case 'coats':
            visitCoatShop();
            break;
        default:
            addMessage('Unknown shop type. Use: shop weapons | shop coats', 'error');
            break;
    }
}

function visitWeaponShop() {
    if (!requireLocationService('weapons', 'weapon shop')) return;
    
    if (window.innerWidth <= 768) {
        showWeaponShopModal();
    } else {
        showDesktopWeaponShop();
    }
}

function showWeaponShopModal() {
    const modal = document.getElementById('mobileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = '🔫 WEAPON SHOP';
    
    const currentWeapon = gameState.player.weapon;
    const weapons = gameState.player.weapons || [];
    const cash = gameState.player.cash;
    
    let weaponHtml = `
        <div class="shop-interface">
            <div class="shop-status">
                <h3>Underground Weapons Dealer</h3>
                <p><strong>Cash:</strong> $${cash.toLocaleString()}</p>
                <p><strong>Current Weapon:</strong> ${currentWeapon ? currentWeapon.name : 'None'}</p>
                <p><strong>Weapons Owned:</strong> ${weapons.length}/2</p>
            </div>
            <div class="shop-actions">
    `;
    
    gameState.weapons.forEach(weapon => {
        const canAfford = cash >= weapon.price;
        const hasWeapon = currentWeapon?.name === weapon.name || weapons.some(w => w.name === weapon.name);
        const canBuy = canAfford && !hasWeapon && (weapons.length < 2 || !currentWeapon);
        
        weaponHtml += `
            <button class="mobile-item shop-item ${!canBuy ? 'disabled' : ''}" 
                    onclick="${canBuy ? `buyWeaponDirect('${weapon.name}')` : ''}">
                <div class="mobile-item-info">
                    <div class="mobile-item-name">${weapon.name} ${hasWeapon ? '(Owned)' : ''}</div>
                    <div class="mobile-item-price">$${weapon.price.toLocaleString()} | Damage: ${weapon.damage}</div>
                    <div class="mobile-item-description">${weapon.description}</div>
                </div>
                <div class="mobile-item-action">
                    ${!canAfford ? 'Too Expensive' : hasWeapon ? 'Already Owned' : 
                      weapons.length >= 2 ? 'Full Inventory' : 'Buy'}
                </div>
            </button>
        `;
    });
    
    // Add sell option if player has weapons
    if (currentWeapon || weapons.length > 0) {
        weaponHtml += `
            <button class="mobile-item shop-item" onclick="showWeaponSellModal()">
                <div class="mobile-item-info">
                    <div class="mobile-item-name">💰 Sell Weapon</div>
                    <div class="mobile-item-price">Get 50% of purchase price</div>
                </div>
            </button>
        `;
    }
    
    weaponHtml += `
            </div>
        </div>
    `;
    
    modalBody.innerHTML = weaponHtml;
    modal.style.display = 'flex';
}

function showDesktopWeaponShop() {
    const gameOutput = document.getElementById('gameOutput');
    const currentWeapon = gameState.player.weapon;
    const weapons = gameState.player.weapons || [];
    const cash = gameState.player.cash;
    
    let weaponHtml = `
        <div class="shop-interface">
            <div class="shop-header">
                <h3>🔫 Underground Weapons Dealer</h3>
                <div class="shop-status">
                    <p><strong>Cash:</strong> $${cash.toLocaleString()}</p>
                    <p><strong>Current Weapon:</strong> ${currentWeapon ? currentWeapon.name : 'None'}</p>
                    <p><strong>Weapons Owned:</strong> ${weapons.length}/2</p>
                </div>
            </div>
            <div class="shop-actions">
                <div class="desktop-actions">
    `;
    
    gameState.weapons.forEach(weapon => {
        const canAfford = cash >= weapon.price;
        const hasWeapon = currentWeapon?.name === weapon.name || weapons.some(w => w.name === weapon.name);
        const canBuy = canAfford && !hasWeapon && (weapons.length < 2 || !currentWeapon);
        
        weaponHtml += `
                    <button class="desktop-btn" onclick="${canBuy ? `buyWeaponDirect('${weapon.name}')` : hasWeapon ? `sellWeaponDirect('${weapon.name}')` : ''}" ${!canBuy && !hasWeapon ? 'disabled' : ''}>
                        <div class="btn-content">
                            <div class="btn-title">${weapon.name} ${hasWeapon ? '(Owned)' : ''}</div>
                            <div class="btn-subtitle">$${weapon.price.toLocaleString()} | ${weapon.damage} dmg</div>
                            <div class="btn-description">${weapon.description}</div>
                        </div>
                    </button>
        `;
    });
    
    weaponHtml += `
                </div>
            </div>
            <div class="shop-actions">
                <div class="desktop-actions">
                    <button class="desktop-btn" onclick="exitWeaponShop()">
                        🔙 Exit Shop
                    </button>
                </div>
            </div>
        </div>
    `;
    
    gameOutput.innerHTML = weaponHtml;
    playSound('touchsound');
}

function exitWeaponShop() {
    const gameOutput = document.getElementById('gameOutput');
    gameOutput.innerHTML = '';
    addMessage('Left the weapon shop.', 'info');
    playSound('touchsound');
}

function visitCoatShop() {
    if (!requireLocationService('clothes', 'coat shop')) return;
    
    if (window.innerWidth <= 768) {
        showCoatShopModal();
    } else {
        showDesktopCoatShop();
    }
}

function showCoatShopModal() {
    const modal = document.getElementById('mobileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = '🧥 COAT SHOP';
    
    const currentCoat = gameState.player.coat;
    const cash = gameState.player.cash;
    const currentCapacity = getCurrentMaxInventory();
    
    let coatHtml = `
        <div class="shop-interface">
            <div class="shop-status">
                <h3>Designer Coats & Jackets</h3>
                <p><strong>Cash:</strong> $${cash.toLocaleString()}</p>
                <p><strong>Current Coat:</strong> ${currentCoat ? currentCoat.name : 'None'}</p>
                <p><strong>Inventory Capacity:</strong> ${currentCapacity}</p>
            </div>
            <div class="shop-actions">
    `;
    
    gameState.coats.forEach(coat => {
        const canAfford = cash >= coat.price;
        const hasCoat = currentCoat?.name === coat.name;
        const canBuy = canAfford && !hasCoat;
        
        coatHtml += `
            <button class="mobile-item shop-item ${!canBuy ? 'disabled' : ''}" 
                    onclick="${canBuy ? `buyCoatDirect('${coat.name}')` : ''}">
                <div class="mobile-item-info">
                    <div class="mobile-item-name">${coat.name} ${hasCoat ? '(Current)' : ''}</div>
                    <div class="mobile-item-price">$${coat.price.toLocaleString()} | Capacity: ${coat.capacity}</div>
                    <div class="mobile-item-description">${coat.description}</div>
                </div>
                <div class="mobile-item-action">
                    ${!canAfford ? 'Too Expensive' : hasCoat ? 'Already Owned' : 
                      currentCoat ? 'Replace Current' : 'Buy'}
                </div>
            </button>
        `;
    });
    
    // Add sell option if player has a coat
    if (currentCoat) {
        coatHtml += `
            <button class="mobile-item shop-item" onclick="sellCoatDirect()">
                <div class="mobile-item-info">
                    <div class="mobile-item-name">💰 Sell Current Coat</div>
                    <div class="mobile-item-price">Get $${Math.floor(currentCoat.price * GAME_CONSTANTS.PRICING.COAT_SELL_MULTIPLIER).toLocaleString()}</div>
                </div>
            </button>
        `;
    }
    
    coatHtml += `
            </div>
        </div>
    `;
    
    modalBody.innerHTML = coatHtml;
    modal.style.display = 'flex';
}

function showDesktopCoatShop() {
    const gameOutput = document.getElementById('gameOutput');
    const currentCoat = gameState.player.coat;
    const cash = gameState.player.cash;
    const currentCapacity = getCurrentMaxInventory();
    
    let coatHtml = `
        <div class="shop-interface">
            <div class="shop-header">
                <h3>🧥 Designer Coats & Jackets</h3>
                <div class="shop-status">
                    <p><strong>Cash:</strong> $${cash.toLocaleString()}</p>
                    <p><strong>Current Coat:</strong> ${currentCoat ? currentCoat.name : 'None'}</p>
                    <p><strong>Current Capacity:</strong> ${currentCapacity} units</p>
                </div>
            </div>
            <div class="shop-actions">
                <div class="desktop-actions">
    `;
    
    gameState.coats.forEach(coat => {
        const canAfford = cash >= coat.price;
        const hasCoat = currentCoat?.name === coat.name;
        const canBuy = canAfford && !hasCoat;
        
        coatHtml += `
                    <button class="desktop-btn" onclick="${canBuy ? `buyCoatDirect('${coat.name}')` : hasCoat ? `sellCoatDirect()` : ''}" ${!canBuy && !hasCoat ? 'disabled' : ''}>
                        <div class="btn-content">
                            <div class="btn-title">${coat.name} ${hasCoat ? '(Owned)' : ''}</div>
                            <div class="btn-subtitle">$${coat.price.toLocaleString()} | ${coat.capacity} units</div>
                            <div class="btn-description">${coat.description}</div>
                        </div>
                    </button>
        `;
    });
    
    coatHtml += `
                </div>
            </div>
            <div class="shop-actions">
                <div class="desktop-actions">
                    <button class="desktop-btn" onclick="exitCoatShop()">
                        🔙 Exit Shop
                    </button>
                </div>
            </div>
        </div>
    `;
    
    gameOutput.innerHTML = coatHtml;
    playSound('touchsound');
}

function exitCoatShop() {
    const gameOutput = document.getElementById('gameOutput');
    gameOutput.innerHTML = '';
    addMessage('Left the coat shop.', 'info');
    playSound('touchsound');
}

// Direct purchase functions for clickable interfaces
function buyWeaponDirect(weaponName) {
    const weapon = gameState.weapons.find(w => w.name === weaponName);
    if (!weapon) return errorMessage('Weapon not found!');
    
    const currentWeapon = gameState.player.weapon;
    const weapons = gameState.player.weapons || [];
    
    // Check if player can afford it
    if (!validateAffordability(weapon.price, weapon.name)) return;
    
    // Check if already owned
    if (currentWeapon?.name === weapon.name || weapons.some(w => w.name === weapon.name)) {
        return errorMessage(`You already own a ${weapon.name}!`);
    }
    
    // Check weapon limit
    if (currentWeapon && weapons.length >= 2) {
        return errorMessage('You already own 2 weapons! Sell one first.');
    }
    
    // Show confirmation dialog
    const confirmMessage = `Are you sure you want to buy ${weapon.name} for $${weapon.price.toLocaleString()}?`;
    
    showConfirmationDialog(confirmMessage, () => {
        // Proceed with purchase
        if (!currentWeapon) {
            // No current weapon, make this the primary weapon
            gameState.player.weapon = weapon;
            processTransaction(weapon.price, weapon.name, 
                `🔫 Bought ${weapon.name} for $${weapon.price.toLocaleString()}!`);
        } else if (weapons.length < 2) {
            // Add to weapons array (secondary weapon)
            if (!gameState.player.weapons) gameState.player.weapons = [];
            gameState.player.weapons.push(weapon);
            processTransaction(weapon.price, weapon.name, 
                `🔫 Bought ${weapon.name} for $${weapon.price.toLocaleString()}! (Secondary weapon)`);
        }
        
        closeMobileModal();
    });
}

function buyCoatDirect(coatName) {
    const coat = gameState.coats.find(c => c.name === coatName);
    if (!coat) return errorMessage('Coat not found!');
    
    const currentCoat = gameState.player.coat;
    
    // Check if player can afford it
    if (!validateAffordability(coat.price, coat.name)) return;
    
    // Check if already owned
    if (currentCoat?.name === coat.name) {
        return errorMessage(`You already own a ${coat.name}!`);
    }
    
    // Build confirmation message
    let confirmMessage = `Are you sure you want to buy ${coat.name} for $${coat.price.toLocaleString()}?`;
    if (currentCoat) {
        const sellPrice = Math.floor(currentCoat.price * GAME_CONSTANTS.PRICING.COAT_SELL_MULTIPLIER);
        confirmMessage += `\n\nYour current ${currentCoat.name} will be sold for $${sellPrice.toLocaleString()}.`;
    }
    
    showConfirmationDialog(confirmMessage, () => {
        // If player has a coat, sell it first (one coat limit)
        if (currentCoat) {
            const sellPrice = Math.floor(currentCoat.price * GAME_CONSTANTS.PRICING.COAT_SELL_MULTIPLIER);
            gameState.player.cash += sellPrice;
            successMessage(`💰 Sold your ${currentCoat.name} for $${sellPrice.toLocaleString()}.`);
        }
        
        // Buy the new coat
        gameState.player.coat = coat;
        processTransaction(coat.price, coat.name, 
            `🧥 Bought ${coat.name} for $${coat.price.toLocaleString()}!`);
        addMessage(`🎒 Your carrying capacity is now ${coat.capacity}.`, 'success');
        closeMobileModal();
    });
}

function sellCoatDirect() {
    const currentCoat = gameState.player.coat;
    if (!currentCoat) return errorMessage("You don't have a coat to sell!");
    
    const sellPrice = Math.floor(currentCoat.price * GAME_CONSTANTS.PRICING.COAT_SELL_MULTIPLIER);
    gameState.player.coat = null;
    
    processSale(sellPrice, currentCoat.name, 
        `💰 Sold your ${currentCoat.name} for $${sellPrice.toLocaleString()}.`);
    closeMobileModal();
}

function showWeaponSellModal() {
    const modal = document.getElementById('mobileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = '💰 SELL WEAPON';
    
    const currentWeapon = gameState.player.weapon;
    const weapons = gameState.player.weapons || [];
    
    let sellHtml = `
        <div class=\"shop-interface\">
            <div class=\"shop-status\">
                <h3>Sell Your Weapons</h3>
                <p>Get 50% of the original purchase price</p>
            </div>
            <div class=\"shop-actions\">
    `;
    
    // Primary weapon
    if (currentWeapon) {
        const sellPrice = Math.floor(currentWeapon.price * GAME_CONSTANTS.PRICING.WEAPON_SELL_MULTIPLIER || 0.5);
        sellHtml += `
            <button class=\"mobile-item shop-item\" onclick=\"sellWeaponDirect('primary')\">
                <div class=\"mobile-item-info\">
                    <div class=\"mobile-item-name\">${currentWeapon.name} (Primary)</div>
                    <div class=\"mobile-item-price\">Sell for $${sellPrice.toLocaleString()}</div>
                </div>
            </button>
        `;
    }
    
    // Secondary weapons
    weapons.forEach((weapon, index) => {
        const sellPrice = Math.floor(weapon.price * GAME_CONSTANTS.PRICING.WEAPON_SELL_MULTIPLIER || 0.5);
        sellHtml += `
            <button class=\"mobile-item shop-item\" onclick=\"sellWeaponDirect('${index}')\">
                <div class=\"mobile-item-info\">
                    <div class=\"mobile-item-name\">${weapon.name} (Secondary)</div>
                    <div class=\"mobile-item-price\">Sell for $${sellPrice.toLocaleString()}</div>
                </div>
            </button>
        `;
    });
    
    sellHtml += `
                <button class=\"mobile-item shop-item\" onclick=\"showWeaponShopModal()\">
                    <div class=\"mobile-item-info\">
                        <div class=\"mobile-item-name\">🔙 Back to Shop</div>
                    </div>
                </button>
            </div>
        </div>
    `;
    
    modalBody.innerHTML = sellHtml;
}

function sellWeaponDirect(weaponIndex) {
    const currentWeapon = gameState.player.weapon;
    const weapons = gameState.player.weapons || [];
    
    let weaponToSell;
    let sellPrice;
    
    if (weaponIndex === 'primary' && currentWeapon) {
        weaponToSell = currentWeapon;
        sellPrice = Math.floor(currentWeapon.price * (GAME_CONSTANTS.PRICING.WEAPON_SELL_MULTIPLIER || 0.5));
        
        // Move a secondary weapon to primary if available
        if (weapons.length > 0) {
            gameState.player.weapon = weapons[0];
            gameState.player.weapons = weapons.slice(1);
        } else {
            gameState.player.weapon = null;
        }
    } else if (typeof weaponIndex === 'string' && !isNaN(weaponIndex)) {
        const index = parseInt(weaponIndex);
        if (index >= 0 && index < weapons.length) {
            weaponToSell = weapons[index];
            sellPrice = Math.floor(weaponToSell.price * (GAME_CONSTANTS.PRICING.WEAPON_SELL_MULTIPLIER || 0.5));
            gameState.player.weapons.splice(index, 1);
        }
    }
    
    if (weaponToSell) {
        gameState.player.cash += sellPrice;
        addMessage(`💰 Sold ${weaponToSell.name} for $${sellPrice.toLocaleString()}.`, 'success');
        playSound('cashreg');
        updateDisplay();
        closeMobileModal();
    } else {
        addMessage('Unable to sell weapon!', 'error');
    }
}

// Price display
function showPrices() {
    let pricesText = '<div class="help-text"><strong>CURRENT PRICES:</strong><br>';
    
    gameState.drugs.forEach(drug => {
        const price = gameState.currentPrices[drug.name];
        pricesText += `${drug.name}: $${price}<br>`;
    });
    
    pricesText += '</div>';
    addMessage(pricesText);
}

// Cities display
function showCities() {
    const currentLocation = gameState.player.location;
    const [currentCity, currentDistrict] = currentLocation.split(' - ');
    
    let citiesText = '<div class="help-text"><strong>TRAVEL OPTIONS:</strong><br><br>';
    
    // Show current city districts first
    citiesText += `<strong>📍 ${currentCity} (Local Travel - Free):</strong><br>`;
    gameState.cities[currentCity].forEach(district => {
        const marker = district === currentDistrict ? ' (current)' : '';
        const locationData = gameState.locationServices[currentCity] && gameState.locationServices[currentCity][district];
        let serviceEmojis = '';
        
        if (locationData && locationData.services && locationData.services.length > 0) {
            serviceEmojis += '🏪'; // General shop indicator
            if (locationData.services.includes('weapons')) serviceEmojis += '🔫';
            if (locationData.services.includes('clothes')) serviceEmojis += '🧥';
            if (locationData.services.includes('bank')) serviceEmojis += '🏦';
        }
        
        citiesText += `&nbsp;&nbsp;${district}${marker} ${serviceEmojis}<br>`;
    });
    
    const isAtAirport = currentDistrict.toLowerCase().includes('airport');
    
    if (isAtAirport) {
        citiesText += '<br><strong>✈️ Other Cities ($20 flight + land at airport):</strong><br>';
        
        // Show other cities
        Object.keys(gameState.cities).forEach(city => {
            if (city !== currentCity) {
                const airportDistrict = gameState.cities[city][0]; // First district is airport
                const locationData = gameState.locationServices[city] && gameState.locationServices[city][airportDistrict];
                let serviceEmojis = '';
                
                if (locationData && locationData.services && locationData.services.length > 0) {
                    serviceEmojis += '🏪'; // General shop indicator
                    if (locationData.services.includes('weapons')) serviceEmojis += '🔫';
                    if (locationData.services.includes('clothes')) serviceEmojis += '🧥';
                    if (locationData.services.includes('bank')) serviceEmojis += '🏦';
                }
                
                citiesText += `&nbsp;&nbsp;${city} (land at ${airportDistrict}) ${serviceEmojis}<br>`;
            }
        });
    } else {
        citiesText += '<br><strong>✈️ Inter-City Travel:</strong><br>';
        citiesText += `&nbsp;&nbsp;❌ Must be at airport to travel between cities<br>`;
        citiesText += `&nbsp;&nbsp;🛫 Go to ${gameState.cities[currentCity][0]} first<br>`;
    }
    
    citiesText += '<br><strong>Usage:</strong> travel [district name] or travel [city name]</div>';
    addMessage(citiesText);
}

// Navigation System
function handleKeyDown(e) {
    // Handle navigation keys
    switch (e.key) {
        case 'Escape':
            if (navigationState.currentMode === 'normal') {
                // If in normal mode, open menu
                toggleMenu();
            } else {
                // If in any navigation mode, exit navigation
                exitNavigation();
            }
            break;
        case 'b':
        case 'B':
            if (navigationState.currentMode === 'normal') {
                enterBuyMode();
            }
            break;
        case 's':
        case 'S':
            if (navigationState.currentMode === 'normal') {
                enterSellMode();
            }
            break;
        case 't':
        case 'T':
            if (navigationState.currentMode === 'normal') {
                enterTravelMode();
            }
            break;
        case 'c':
        case 'C':
            if (navigationState.currentMode === 'normal') {
                enterChartsMode();
            }
            break;
        case 'h':
        case 'H':
            if (navigationState.currentMode === 'normal') {
                enterHistoryMode();
            }
            break;
        case 'ArrowUp':
            if (navigationState.isNavigating) {
                navigateUp();
                e.preventDefault();
            }
            break;
        case 'ArrowDown':
            if (navigationState.isNavigating) {
                navigateDown();
                e.preventDefault();
            }
            break;
        case 'ArrowLeft':
            if (navigationState.currentMode === 'quantity') {
                decreaseQuantity();
                e.preventDefault();
            }
            break;
        case 'ArrowRight':
            if (navigationState.currentMode === 'quantity') {
                increaseQuantity();
                e.preventDefault();
            }
            break;
        case 'Enter':
            if (navigationState.isNavigating) {
                confirmSelection();
                e.preventDefault();
            }
            break;
        case '+':
        case '=':
            if (navigationState.currentMode === 'quantity') {
                increaseQuantity();
                e.preventDefault();
            }
            break;
        case '-':
        case '_':
            if (navigationState.currentMode === 'quantity') {
                decreaseQuantity();
                e.preventDefault();
            }
            break;
    }
}

function handleKeyUp(e) {
    // Handle any key up events if needed
}

function enterBuyMode() {
    navigationState.isNavigating = true;
    navigationState.currentMode = 'market';
    navigationState.selectedIndex = 0;
    navigationState.actionType = 'buy';
    navigationState.quantity = 1; // Will be updated when item is selected
    
    showNavigationHint('Use arrow keys to select item, Enter to confirm, Escape to cancel');
    NavigationHighlighter.highlightMarketItem(navigationState.selectedIndex);
    addMessage('Buy mode activated. Select a drug to purchase.', 'success');
    playSound('touchsound'); // Navigation sound
}

function enterSellMode() {
    const inventoryItems = Object.keys(gameState.player.inventory);
    
    if (inventoryItems.length === 0) {
        addMessage('Your inventory is empty. Nothing to sell.', 'error');
        return;
    }
    
    navigationState.isNavigating = true;
    navigationState.currentMode = 'inventory';
    navigationState.selectedIndex = 0;
    navigationState.actionType = 'sell';
    navigationState.quantity = 1; // Will be updated when item is selected
    
    showNavigationHint('Use arrow keys to select item, Enter to confirm, Escape to cancel');
    NavigationHighlighter.highlightInventoryItem(navigationState.selectedIndex);
    addMessage('Sell mode activated. Select an item to sell.', 'success');
    playSound('touchsound'); // Navigation sound
}

function enterTravelMode() {
    navigationState.isNavigating = true;
    navigationState.currentMode = 'travel';
    navigationState.selectedIndex = 0;
    navigationState.actionType = 'travel';
    
    showClickableTravelInterface();
    addMessage('Travel mode activated. Click on a destination to travel.', 'success');
    playSound('touchsound'); // Navigation sound
}

function enterChartsMode() {
    navigationState.isNavigating = true;
    navigationState.currentMode = 'charts';
    navigationState.selectedIndex = 0;
    navigationState.actionType = 'charts';
    
    showNavigationHint('Click on a drug in the market prices to view its price chart');
    NavigationHighlighter.highlightMarketItem(navigationState.selectedIndex);
    addMessage('Charts mode activated. Click on a drug to view its price chart.', 'success');
    playSound('touchsound'); // Navigation sound
}

function enterHistoryMode() {
    const inventoryItems = Object.keys(gameState.player.inventory);
    
    if (inventoryItems.length === 0) {
        addMessage('Your inventory is empty. No purchase history to show.', 'error');
        return;
    }
    
    navigationState.isNavigating = true;
    navigationState.currentMode = 'history';
    navigationState.selectedIndex = 0;
    navigationState.actionType = 'history';
    
    showNavigationHint('Click on an item in your inventory to view its purchase history');
    NavigationHighlighter.highlightInventoryItem(navigationState.selectedIndex);
    addMessage('History mode activated. Click on an item to view its purchase history.', 'success');
    playSound('touchsound'); // Navigation sound
}

function enterBankMode() {
    // Check if current location has a bank
    if (!requireLocationService('bank', 'bank')) return;
    
    showBankInterface();
}

function showBankInterface() {
    const bankBalance = gameState.player.bankBalance || 0;
    const cash = gameState.player.cash;
    
    // Check if we're on mobile/desktop and show appropriate interface
    if (window.innerWidth <= 768) {
        showMobileBankInterface();
    } else {
        showDesktopBankInterface();
    }
}

function showMobileBankInterface() {
    const bankBalance = gameState.player.bankBalance || 0;
    const cash = gameState.player.cash;
    
    const modal = document.getElementById('mobileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = '🏦 BANK SERVICES';
    
    let bankHtml = `
        <div class="banking-interface">
            <div class="banking-status">
                <h3>First National Bank of Street Commerce</h3>
                <p><strong>Cash:</strong> $${cash.toLocaleString()}</p>
                <p><strong>Bank Balance:</strong> $${bankBalance.toLocaleString()}</p>
                <p><em>Bank money is safe from police confiscation!</em></p>
            </div>
            <div class="banking-actions">
                <button class="mobile-item banking-action" onclick="showBankingAction('deposit')">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">💰 Deposit</div>
                        <div class="mobile-item-price">Put money in bank</div>
                    </div>
                </button>
                <button class="mobile-item banking-action" onclick="showBankingAction('withdraw')">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">💸 Withdraw</div>
                        <div class="mobile-item-price">Take money out</div>
                    </div>
                </button>
                <button class="mobile-item banking-action" onclick="showBankingAction('balance')">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">📊 Check Balance</div>
                        <div class="mobile-item-price">View account status</div>
                    </div>
                </button>
            </div>
        </div>
    `;
    
    modalBody.innerHTML = bankHtml;
    modal.style.display = 'flex';
    playSound('touchsound');
}

function showDesktopBankInterface() {
    const bankBalance = gameState.player.bankBalance || 0;
    const cash = gameState.player.cash;
    
    const gameOutput = document.getElementById('gameOutput');
    gameOutput.innerHTML = `
        <div class="banking-interface">
            <div class="banking-header">
                <h3>🏦 First National Bank of Street Commerce</h3>
                <div class="banking-status">
                    <p><strong>Cash:</strong> $${cash.toLocaleString()}</p>
                    <p><strong>Bank Balance:</strong> $${bankBalance.toLocaleString()}</p>
                    <p><em>💡 Bank money is safe from police confiscation!</em></p>
                </div>
            </div>
            <div class="banking-actions">
                <div class="desktop-actions">
                    <button class="desktop-btn" onclick="showDesktopBankingAction('deposit')" ${cash <= 0 ? 'disabled' : ''}>
                        💰 Deposit
                    </button>
                    <button class="desktop-btn" onclick="showDesktopBankingAction('withdraw')" ${bankBalance <= 0 ? 'disabled' : ''}>
                        🏦 Withdraw
                    </button>
                    <button class="desktop-btn" onclick="exitBankingInterface()">
                        🔙 Exit
                    </button>
                </div>
            </div>
        </div>
    `;
    playSound('touchsound');
}

function showDesktopBankingAction(action) {
    const bankBalance = gameState.player.bankBalance || 0;
    const cash = gameState.player.cash;
    
    const isDeposit = action === 'deposit';
    const maxAmount = isDeposit ? cash : bankBalance;
    const actionVerb = isDeposit ? 'deposit' : 'withdraw';
    const preposition = isDeposit ? 'into' : 'from';
    
    if (maxAmount <= 0) {
        addMessage(`You don't have any ${isDeposit ? 'cash' : 'bank balance'} to ${actionVerb}!`, 'error');
        playSound('uhoh');
        return;
    }
    
    const gameOutput = document.getElementById('gameOutput');
    gameOutput.innerHTML = `
        <div class="banking-interface">
            <div class="banking-header">
                <h3>${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)} Money</h3>
                <div class="banking-status">
                    <p><strong>Available:</strong> $${maxAmount.toLocaleString()}</p>
                    <p>How much would you like to ${actionVerb} ${preposition} your ${isDeposit ? 'bank account' : 'cash'}?</p>
                </div>
            </div>
            <div class="banking-input">
                <input type="number" id="bankingAmount" placeholder="Enter amount" min="1" max="${maxAmount}" class="amount-input">
                <div class="quick-amounts">
                    <button class="quick-btn" onclick="setDesktopBankingAmount(${Math.floor(maxAmount * 0.25)})">25%</button>
                    <button class="quick-btn" onclick="setDesktopBankingAmount(${Math.floor(maxAmount * 0.5)})">50%</button>
                    <button class="quick-btn" onclick="setDesktopBankingAmount(${Math.floor(maxAmount * 0.75)})">75%</button>
                    <button class="quick-btn" onclick="setDesktopBankingAmount(${maxAmount})">Max</button>
                </div>
                <div class="banking-actions">
                    <div class="desktop-actions">
                        <button class="desktop-btn" onclick="processDesktopBankingTransaction('${action}')">
                            ${isDeposit ? '💰 Deposit' : '🏦 Withdraw'}
                        </button>
                        <button class="desktop-btn" onclick="showDesktopBankInterface()">
                            🔙 Back to Banking
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Focus on the input field
    setTimeout(() => {
        document.getElementById('bankingAmount').focus();
    }, 100);
    
    playSound('touchsound');
}

function showBankingAction(action) {
    const bankBalance = gameState.player.bankBalance || 0;
    const cash = gameState.player.cash;
    
    const modal = document.getElementById('mobileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    const actionTitles = {
        'deposit': '💰 DEPOSIT MONEY',
        'withdraw': '💸 WITHDRAW MONEY',
        'balance': '📊 ACCOUNT BALANCE'
    };
    
    modalTitle.textContent = actionTitles[action];
    
    if (action === 'balance') {
        modalBody.innerHTML = `
            <div class="banking-interface">
                <div class="banking-status">
                    <h3>Account Status</h3>
                    <p><strong>Cash:</strong> $${cash.toLocaleString()}</p>
                    <p><strong>Bank Balance:</strong> $${bankBalance.toLocaleString()}</p>
                    <p><strong>Total Assets:</strong> $${(cash + bankBalance).toLocaleString()}</p>
                </div>
                <div class="banking-actions">
                    <button class="mobile-item banking-action" onclick="showMobileBankInterface()">
                        <div class="mobile-item-info">
                            <div class="mobile-item-name">🔙 Back to Banking</div>
                        </div>
                    </button>
                </div>
            </div>
        `;
        playSound('touchsound');
        return;
    }
    
    const isDeposit = action === 'deposit';
    const maxAmount = isDeposit ? cash : bankBalance;
    const actionVerb = isDeposit ? 'deposit' : 'withdraw';
    const preposition = isDeposit ? 'into' : 'from';
    
    if (maxAmount <= 0) {
        modalBody.innerHTML = `
            <div class="banking-interface">
                <div class="banking-status">
                    <h3>Unable to ${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)}</h3>
                    <p>${isDeposit ? 'You have no cash to deposit.' : 'Your bank account is empty.'}</p>
                </div>
                <div class="banking-actions">
                    <button class="mobile-item banking-action" onclick="showMobileBankInterface()">
                        <div class="mobile-item-info">
                            <div class="mobile-item-name">🔙 Back to Banking</div>
                        </div>
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    modalBody.innerHTML = `
        <div class="banking-interface">
            <div class="banking-status">
                <h3>${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)} Money</h3>
                <p><strong>Available:</strong> $${maxAmount.toLocaleString()}</p>
                <p>How much would you like to ${actionVerb} ${preposition} your ${isDeposit ? 'bank account' : 'cash'}?</p>
            </div>
            <div class="banking-input">
                <input type="number" id="bankingAmount" placeholder="Enter amount" min="1" max="${maxAmount}">
                <div class="debt-quick-amounts">
                    <button class="debt-quick-amount" onclick="setBankingAmount(${Math.floor(maxAmount * 0.25)})">25%</button>
                    <button class="debt-quick-amount" onclick="setBankingAmount(${Math.floor(maxAmount * 0.5)})">50%</button>
                    <button class="debt-quick-amount" onclick="setBankingAmount(${Math.floor(maxAmount * 0.75)})">75%</button>
                    <button class="debt-quick-amount" onclick="setBankingAmount(${maxAmount})">All</button>
                </div>
            </div>
            <div class="banking-actions">
                <button class="mobile-item banking-action" onclick="processBankingTransaction('${action}')">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">✓ Confirm ${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)}</div>
                    </div>
                </button>
                <button class="mobile-item banking-action" onclick="showMobileBankInterface()">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">🔙 Back to Banking</div>
                    </div>
                </button>
            </div>
        </div>
    `;
    
    // Store the action type for processing
    gameState.currentBankingAction = action;
}

function setDesktopBankingAmount(amount) {
    const input = document.getElementById('bankingAmount');
    if (input) {
        input.value = amount;
    }
}

function setBankingAmount(amount) {
    const input = document.getElementById('bankingAmount');
    if (input) {
        input.value = amount;
    }
}

function processDesktopBankingTransaction(action) {
    const amount = parseInt(document.getElementById('bankingAmount').value);
    const bankBalance = gameState.player.bankBalance || 0;
    
    if (!amount || amount <= 0) {
        addMessage('Please enter a valid amount.', 'error');
        playSound('uhoh');
        return;
    }
    
    const isDeposit = action === 'deposit';
    const maxAmount = isDeposit ? gameState.player.cash : bankBalance;
    
    if (amount > maxAmount) {
        addMessage(`You ${isDeposit ? 'only have' : 'can only withdraw'} $${maxAmount.toLocaleString()}!`, 'error');
        playSound('uhoh');
        return;
    }
    
    // Process the transaction
    if (isDeposit) {
        gameState.player.cash -= amount;
        gameState.player.bankBalance = (gameState.player.bankBalance || 0) + amount;
        addMessage(`💰 Deposited $${amount.toLocaleString()} into your bank account!`, 'success');
    } else {
        gameState.player.bankBalance -= amount;
        gameState.player.cash += amount;
        addMessage(`🏦 Withdrew $${amount.toLocaleString()} from your bank account!`, 'success');
    }
    
    updateDisplay();
    playSound('cashreg');
    
    // Show updated banking interface
    setTimeout(() => {
        showDesktopBankInterface();
    }, 1000);
}

function exitBankingInterface() {
    const gameOutput = document.getElementById('gameOutput');
    gameOutput.innerHTML = `
        <div class="welcome-message">
            <p>Welcome to Packet Pushers!</p>
            <p>You owe the loan shark $${gameState.player.debt.toLocaleString()} with daily interest.</p>
            <p>You have ${gameState.player.maxDays - gameState.player.day + 1} days remaining.</p>
            <p>Use the controls to navigate the market.</p>
        </div>
    `;
    playSound('touchsound');
}

function processBankingTransaction(action) {
    const amount = parseInt(document.getElementById('bankingAmount').value);
    const bankBalance = gameState.player.bankBalance || 0;
    const cash = gameState.player.cash;
    
    if (!amount || amount <= 0) {
        addMessage('Please enter a valid amount.', 'error');
        return;
    }
    
    if (action === 'deposit') {
        if (amount > cash) {
            addMessage('You don\'t have enough cash!', 'error');
            return;
        }
        
        gameState.player.cash -= amount;
        gameState.player.bankBalance = (gameState.player.bankBalance || 0) + amount;
        addMessage(`💰 Deposited $${amount.toLocaleString()} into your bank account.`, 'success');
        playSound('cashreg');
        
    } else if (action === 'withdraw') {
        if (amount > bankBalance) {
            addMessage('You don\'t have enough money in your bank account!', 'error');
            return;
        }
        
        gameState.player.bankBalance -= amount;
        gameState.player.cash += amount;
        addMessage(`💸 Withdrew $${amount.toLocaleString()} from your bank account.`, 'success');
        playSound('cashreg');
    }
    
    updateDisplay();
    closeMobileModal();
}

function showQuickBank() {
    const currentLocation = gameState.player.location;
    const [city, area] = currentLocation.split(' - ');
    
    if (!gameState.locationServices[city] || !gameState.locationServices[city][area] || 
        !gameState.locationServices[city][area].services.includes('bank')) {
        addMessage('🏦 No bank available at this location. Banks are available in finance districts and city centers.', 'error');
        return;
    }
    
    showBankInterface();
}

function navigateUp() {
    if (navigationState.selectedIndex > 0) {
        navigationState.selectedIndex--;
        updateNavigation();
    }
}

function navigateDown() {
    let maxIndex = 0;
    
    if (navigationState.currentMode === 'market') {
        if (!gameState.drugs || gameState.drugs.length === 0) return;
        maxIndex = gameState.drugs.length - 1;
    } else if (navigationState.currentMode === 'inventory') {
        const inventoryItems = Object.keys(gameState.player.inventory || {});
        if (inventoryItems.length === 0) return;
        maxIndex = inventoryItems.length - 1;
    } else if (navigationState.currentMode === 'travel') {
        if (!gameState.currentAvailableDestinations || gameState.currentAvailableDestinations.length === 0) return;
        maxIndex = gameState.currentAvailableDestinations.length - 1;
    }
    
    if (navigationState.selectedIndex < maxIndex) {
        navigationState.selectedIndex++;
        updateNavigation();
    }
}

function increaseQuantity() {
    if (navigationState.currentMode === 'quantity') {
        let maxQuantity = Infinity;
        
        // For selling, limit to available inventory
        if (navigationState.actionType === 'sell') {
            const drugName = navigationState.selectedItem;
            maxQuantity = gameState.player.inventory[drugName] || 0;
        }
        // For buying, limit to available cash and inventory space
        else if (navigationState.actionType === 'buy') {
            const price = gameState.currentPrices[navigationState.selectedItem.name];
            const maxAffordable = Math.floor(gameState.player.cash / price);
            const inventorySpace = getCurrentMaxInventory() - getCurrentInventorySize();
            maxQuantity = Math.min(maxAffordable, inventorySpace);
        }
        
        if (navigationState.quantity < maxQuantity) {
            navigationState.quantity++;
            updateQuantityDisplay();
        }
    }
}

function decreaseQuantity() {
    if (navigationState.currentMode === 'quantity' && navigationState.quantity > 1) {
        navigationState.quantity--;
        updateQuantityDisplay();
    }
}

function updateQuantityFromInput(value) {
    const quantity = parseInt(value);
    if (!isNaN(quantity) && quantity > 0) {
        let maxQuantity = Infinity;
        
        // Apply the same limits as increaseQuantity
        if (navigationState.actionType === 'sell') {
            const drugName = navigationState.selectedItem;
            maxQuantity = gameState.player.inventory[drugName] || 0;
        } else if (navigationState.actionType === 'buy') {
            const price = gameState.currentPrices[navigationState.selectedItem.name];
            const maxAffordable = Math.floor(gameState.player.cash / price);
            const inventorySpace = getCurrentMaxInventory() - getCurrentInventorySize();
            maxQuantity = Math.min(maxAffordable, inventorySpace);
        }
        
        navigationState.quantity = Math.min(Math.max(1, quantity), maxQuantity);
        updateQuantityDisplay();
    }
}

function handleQuantityKeypress(event) {
    if (event.key === 'Enter') {
        executeAction();
    }
}

function setMaxQuantity() {
    let maxQuantity = 1;
    
    if (navigationState.actionType === 'sell') {
        const drugName = navigationState.selectedItem;
        maxQuantity = gameState.player.inventory[drugName] || 0;
    } else if (navigationState.actionType === 'buy') {
        const price = gameState.currentPrices[navigationState.selectedItem.name];
        const maxAffordable = Math.floor(gameState.player.cash / price);
        const inventorySpace = getCurrentMaxInventory() - getCurrentInventorySize();
        maxQuantity = Math.min(maxAffordable, inventorySpace);
    }
    
    navigationState.quantity = Math.max(1, maxQuantity);
    updateQuantityDisplay();
}

function confirmSelection() {
    if (navigationState.currentMode === 'market') {
        const selectedDrug = gameState.drugs[navigationState.selectedIndex];
        navigationState.selectedItem = selectedDrug;
        enterQuantityMode();
    } else if (navigationState.currentMode === 'inventory') {
        const inventoryItems = Object.keys(gameState.player.inventory);
        const selectedDrug = inventoryItems[navigationState.selectedIndex];
        navigationState.selectedItem = selectedDrug;
        enterQuantityMode();
    } else if (navigationState.currentMode === 'travel') {
        const selectedDestination = gameState.currentAvailableDestinations[navigationState.selectedIndex];
        executeTravel(selectedDestination.fullName);
    } else if (navigationState.currentMode === 'quantity') {
        executeAction();
    }
}

function enterQuantityMode() {
    navigationState.currentMode = 'quantity';
    
    // Auto-default quantity to maximum affordable/available
    if (navigationState.actionType === 'buy') {
        const price = gameState.currentPrices[navigationState.selectedItem.name];
        const maxAffordable = Math.floor(gameState.player.cash / price);
        const inventorySpace = getCurrentMaxInventory() - getCurrentInventorySize();
        navigationState.quantity = Math.min(maxAffordable, inventorySpace);
    } else if (navigationState.actionType === 'sell') {
        const drugName = navigationState.selectedItem;
        const availableQuantity = gameState.player.inventory[drugName] || 0;
        navigationState.quantity = Math.max(1, availableQuantity); // Start with max available for selling
    }
    
    // Ensure quantity is at least 1 for valid transactions
    navigationState.quantity = Math.max(1, navigationState.quantity);
    
    showQuantitySelector();
    showNavigationHint('Use +/- or arrow keys to adjust quantity, Enter to confirm, Escape to cancel');
}

function executeAction() {
    if (navigationState.actionType === 'buy') {
        // Direct buy execution
        const drug = navigationState.selectedItem;
        const quantity = navigationState.quantity;
        const price = gameState.currentPrices[drug.name];
        const totalCost = price * quantity;
        
        // Check if player can afford it
        if (!validateAffordability(totalCost, `${quantity} ${drug.name}`)) {
            exitNavigation();
            return;
        }
        
        // Check inventory space
        if (!validateInventorySpace(quantity, drug.name)) {
            exitNavigation();
            return;
        }
        
        // Show confirmation dialog
        const confirmMessage = `Are you sure you want to buy ${quantity} ${drug.name} for $${totalCost.toLocaleString()}?`;
        
        showConfirmationDialog(confirmMessage, () => {
            // Execute purchase
            gameState.player.inventory[drug.name] = (gameState.player.inventory[drug.name] || 0) + quantity;
            processTransaction(totalCost, `${quantity} ${drug.name}`, 
                `💰 Bought ${quantity} ${drug.name} for $${totalCost.toLocaleString()}!`);
            
            // Track purchase history
            if (!gameState.player.purchaseHistory[drug.name]) {
                gameState.player.purchaseHistory[drug.name] = [];
            }
            gameState.player.purchaseHistory[drug.name].push({
                quantity: quantity,
                price: price,
                day: gameState.player.day,
                location: gameState.player.location
            });
            
            exitNavigation();
        }, () => {
            exitNavigation();
        });
        
    } else if (navigationState.actionType === 'sell') {
        // Direct sell execution
        const drugName = navigationState.selectedItem;
        const quantity = navigationState.quantity;
        const currentAmount = gameState.player.inventory[drugName] || 0;
        
        if (currentAmount < quantity) {
            errorMessage(`You only have ${currentAmount} ${drugName}!`);
            exitNavigation();
            return;
        }
        
        const price = gameState.currentPrices[drugName];
        const totalValue = price * quantity;
        
        // Execute sale
        gameState.player.inventory[drugName] -= quantity;
        if (gameState.player.inventory[drugName] <= 0) {
            delete gameState.player.inventory[drugName];
        }
        
        processSale(totalValue, `${quantity} ${drugName}`, 
            `💰 Sold ${quantity} ${drugName} for $${totalValue.toLocaleString()}!`);
    }
    
    exitNavigation();
}

function executeTravel(fullLocationName) {
    // Parse the full location name to get the appropriate travel command
    const selectedDestination = gameState.currentAvailableDestinations.find(dest => 
        dest.fullName === fullLocationName
    );
    
    if (!selectedDestination) {
        addMessage('Invalid destination selected.', 'error');
        exitNavigation();
        return;
    }
    
    let command;
    if (selectedDestination.type === 'local') {
        // For local travel, use district name
        command = `travel ${selectedDestination.name}`;
    } else {
        // For inter-city travel, use city name
        command = `travel ${selectedDestination.name}`;
    }
    
    processCommand(command);
    exitNavigation();
}

function exitNavigation() {
    navigationState.isNavigating = false;
    navigationState.currentMode = 'normal';
    navigationState.selectedIndex = 0;
    navigationState.selectedItem = null;
    navigationState.quantity = 1;
    navigationState.actionType = null;
    
    NavigationHighlighter.clearHighlights();
    hideNavigationHint();
    hideCityOptions();
    hideQuantitySelector();
    
    // Command input removed - using clickable interface only
}

function updateNavigation() {
    if (navigationState.currentMode === 'market') {
        NavigationHighlighter.highlightMarketItem(navigationState.selectedIndex);
    } else if (navigationState.currentMode === 'inventory') {
        NavigationHighlighter.highlightInventoryItem(navigationState.selectedIndex);
    } else if (navigationState.currentMode === 'travel') {
        NavigationHighlighter.highlightCityOption(navigationState.selectedIndex);
    } else if (navigationState.currentMode === 'charts') {
        NavigationHighlighter.highlightMarketItem(navigationState.selectedIndex);
    } else if (navigationState.currentMode === 'history') {
        NavigationHighlighter.highlightInventoryItem(navigationState.selectedIndex);
    }
}

// Navigation highlighting functions consolidated into NavigationHighlighter class

function showNavigationHint(text) {
    let hint = document.querySelector('.navigation-hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.className = 'navigation-hint';
        document.body.appendChild(hint);
    }
    hint.textContent = text;
    hint.style.display = 'block';
}

function hideNavigationHint() {
    const hint = document.querySelector('.navigation-hint');
    if (hint) {
        hint.style.display = 'none';
    }
}

function showCityOptions() {
    const gameOutput = document.getElementById('gameOutput');
    const currentLocation = gameState.player.location;
    const [currentCity, currentDistrict] = currentLocation.split(' - ');
    const isAtAirport = currentDistrict.toLowerCase().includes('airport');
    
    // Build list of available destinations
    const availableDestinations = [];
    
    // Add local districts (within same city)
    gameState.cities[currentCity].forEach(district => {
        if (district !== currentDistrict) {
            availableDestinations.push({
                name: district,
                fullName: `${currentCity} - ${district}`,
                type: 'local',
                cost: ''
            });
        }
    });
    
    // Add other cities (only if at airport)
    if (isAtAirport) {
        Object.keys(gameState.cities).forEach(city => {
            if (city !== currentCity) {
                const airportDistrict = gameState.cities[city][0];
                availableDestinations.push({
                    name: city,
                    fullName: `${city} - ${airportDistrict}`,
                    type: 'intercity',
                    cost: '$20'
                });
            }
        });
    }
    
    // Store filtered destinations for navigation
    gameState.currentAvailableDestinations = availableDestinations;
    
    let citiesDiv = document.querySelector('.cities-navigation');
    if (citiesDiv) {
        citiesDiv.remove();
    }
    
    citiesDiv = document.createElement('div');
    citiesDiv.className = 'cities-navigation';
    
    let optionsHtml = '<div class="help-text"><strong>SELECT DESTINATION:</strong><br>';
    
    if (availableDestinations.length === 0) {
        optionsHtml += '<div class="cities-list">No destinations available</div>';
    } else {
        // Group by type
        const localDestinations = availableDestinations.filter(d => d.type === 'local');
        const intercityDestinations = availableDestinations.filter(d => d.type === 'intercity');
        
        optionsHtml += '<div class="cities-list">';
        
        // Show local destinations first
        if (localDestinations.length > 0) {
            optionsHtml += '<div style="margin-bottom: 10px;"><strong>📍 Local:</strong></div>';
            localDestinations.forEach(dest => {
                // Get service icons for this destination
                const [city, district] = dest.fullName.split(' - ');
                const locationData = gameState.locationServices[city] && gameState.locationServices[city][district];
                let serviceEmojis = '';
                
                if (locationData && locationData.services && locationData.services.length > 0) {
                    serviceEmojis += '🏪'; // General shop indicator
                    if (locationData.services.includes('weapons')) serviceEmojis += '🔫';
                    if (locationData.services.includes('clothes')) serviceEmojis += '🧥';
                    if (locationData.services.includes('bank')) serviceEmojis += '🏦';
                }
                
                optionsHtml += `
                    <div class="city-option" data-city="${dest.fullName}">
                        ${dest.name} ${serviceEmojis}
                    </div>
                `;
            });
        }
        
        // Show inter-city destinations
        if (intercityDestinations.length > 0) {
            optionsHtml += '</div>'; // Close current cities-list
            optionsHtml += '<div style="margin-top: 15px; margin-bottom: 10px;"><strong>✈️ Inter-City ($20):</strong></div>';
            optionsHtml += '<div class="cities-list">'; // Start new cities-list for inter-city
            intercityDestinations.forEach(dest => {
                // Get service icons for this destination (airport)
                const [city, district] = dest.fullName.split(' - ');
                const locationData = gameState.locationServices[city] && gameState.locationServices[city][district];
                let serviceEmojis = '';
                
                if (locationData && locationData.services && locationData.services.length > 0) {
                    serviceEmojis += '🏪'; // General shop indicator
                    if (locationData.services.includes('weapons')) serviceEmojis += '🔫';
                    if (locationData.services.includes('clothes')) serviceEmojis += '🧥';
                    if (locationData.services.includes('bank')) serviceEmojis += '🏦';
                }
                
                optionsHtml += `
                    <div class="city-option" data-city="${dest.fullName}">
                        ${dest.name} ${serviceEmojis}
                    </div>
                `;
            });
        }
        
        // Show restriction message if not at airport
        if (!isAtAirport && intercityDestinations.length === 0) {
            optionsHtml += '</div>'; // Close current cities-list
            optionsHtml += '<div style="margin-top: 15px; margin-bottom: 10px;"><strong>✈️ Inter-City Travel:</strong></div>';
            optionsHtml += `<div style="color: #FF4444; padding: 8px 12px; margin-left: 4px;">❌ Must be at ${gameState.cities[currentCity][0]} for flights</div>`;
            optionsHtml += '<div class="cities-list">'; // Start new empty cities-list to maintain structure
        }
        
        optionsHtml += '</div>';
    }
    
    optionsHtml += '</div>';
    citiesDiv.innerHTML = optionsHtml;
    
    gameOutput.appendChild(citiesDiv);
    gameOutput.scrollTop = gameOutput.scrollHeight;
    
    // Add click handlers for city options
    const cityOptions = citiesDiv.querySelectorAll('.city-option');
    cityOptions.forEach((option, index) => {
        const cityName = option.getAttribute('data-city');
        if (cityName !== gameState.player.location) {
            option.addEventListener('click', () => {
                executeTravel(cityName);
            });
            option.style.cursor = 'pointer';
        }
    });
    
    // Highlight current selection
    NavigationHighlighter.highlightCityOption(navigationState.selectedIndex);
}

function hideCityOptions() {
    const citiesDiv = document.querySelector('.cities-navigation');
    if (citiesDiv) {
        citiesDiv.remove();
    }
}

function showQuantitySelector() {
    const gameOutput = document.getElementById('gameOutput');
    
    let quantityDiv = document.querySelector('.quantity-navigation');
    if (quantityDiv) {
        quantityDiv.remove();
    }
    
    const itemName = navigationState.actionType === 'buy' ? 
        navigationState.selectedItem.name : 
        navigationState.selectedItem;
    
    const action = navigationState.actionType === 'buy' ? 'BUY' : 'SELL';
    const price = navigationState.actionType === 'buy' ? 
        gameState.currentPrices[navigationState.selectedItem.name] : 
        gameState.currentPrices[navigationState.selectedItem];
    
    quantityDiv = document.createElement('div');
    quantityDiv.className = 'quantity-navigation';
    quantityDiv.innerHTML = `
        <div class="help-text">
            <strong>${action} ${itemName}</strong><br>
            Price: $${price} each<br>
            <div class="quantity-input">
                <span>Quantity:</span>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="decreaseQuantity()">-</button>
                    <input type="number" class="quantity-input-field" value="${navigationState.quantity}" min="1" 
                           onchange="updateQuantityFromInput(this.value)" 
                           onkeypress="handleQuantityKeypress(event)">
                    <button class="quantity-btn" onclick="increaseQuantity()">+</button>
                    <button class="quantity-btn" onclick="setMaxQuantity()" style="margin-left: 5px;">Max</button>
                </div>
                <div class="quantity-display">Total: $${price * navigationState.quantity}</div>
            </div>
            <div style="margin-top: 10px;">
                <button class="menu-btn" onclick="executeAction()" style="margin-right: 10px;">
                    ${action} ${itemName}
                </button>
                <button class="menu-btn" onclick="exitNavigation()">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    gameOutput.appendChild(quantityDiv);
    gameOutput.scrollTop = gameOutput.scrollHeight;
}

function hideQuantitySelector() {
    const quantityDiv = document.querySelector('.quantity-navigation');
    if (quantityDiv) {
        quantityDiv.remove();
    }
}

function updateQuantityDisplay() {
    const quantityInputField = document.querySelector('.quantity-input-field');
    const quantityDisplay = document.querySelector('.quantity-display');
    
    if (quantityInputField) {
        quantityInputField.value = navigationState.quantity;
    }
    
    if (quantityDisplay) {
        const price = navigationState.actionType === 'buy' ? 
            gameState.currentPrices[navigationState.selectedItem.name] : 
            gameState.currentPrices[navigationState.selectedItem];
        quantityDisplay.textContent = `Total: $${price * navigationState.quantity}`;
    }
}

// Mobile Touch Interface
let mobileState = {
    currentAction: null, // 'buy', 'sell', 'travel'
    selectedItem: null,
    quantity: 1
};

function showQuickBuy() {
    mobileState.currentAction = 'buy';
    showMobileBuyModal();
}

function showQuickSell() {
    const inventoryItems = Object.keys(gameState.player.inventory);
    if (inventoryItems.length === 0) {
        addMessage('Your inventory is empty. Nothing to sell.', 'error');
        return;
    }
    
    mobileState.currentAction = 'sell';
    showMobileSellModal();
}

function showQuickTravel() {
    mobileState.currentAction = 'travel';
    showMobileTravelModal();
}

function showQuickMenu() {
    toggleMenu();
}

function showQuickCharts() {
    mobileState.currentAction = 'charts';
    showMobileChartsModal();
}

function showMobileBuyModal() {
    MobileModalManager.show('buy', gameState.drugs, drug => gameState.currentPrices[drug.name]);
}

function showMobileSellModal() {
    MobileModalManager.show('sell', Object.keys(gameState.player.inventory), drug => gameState.currentPrices[drug]);
}

function showMobileTravelModal() {
    const modal = document.getElementById('mobileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = '🚗 TRAVEL DESTINATIONS';
    
    const currentLocation = gameState.player.location;
    const [currentCity, currentDistrict] = currentLocation.split(' - ');
    const isAtAirport = currentDistrict.toLowerCase().includes('airport');
    
    let itemsHtml = '<div class="mobile-item-list">';
    
    // Add local districts (within same city) - FREE
    gameState.cities[currentCity].forEach(district => {
        if (district !== currentDistrict) {
            const fullLocation = `${currentCity} - ${district}`;
            itemsHtml += `
                <div class="mobile-item" onclick="selectMobileCity('${fullLocation}')">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">${district}</div>
                        <div class="mobile-item-price">Local travel - FREE</div>
                    </div>
                    <div class="mobile-item-action">🚶 WALK</div>
                </div>
            `;
        }
    });
    
    // Add other cities (only if at airport) - $20 + 1 day
    if (isAtAirport) {
        Object.keys(gameState.cities).forEach(city => {
            if (city !== currentCity) {
                const airportDistrict = gameState.cities[city][0];
                const fullLocation = `${city} - ${airportDistrict}`;
                itemsHtml += `
                    <div class="mobile-item" onclick="selectMobileCity('${fullLocation}')">
                        <div class="mobile-item-info">
                            <div class="mobile-item-name">${city}</div>
                            <div class="mobile-item-price">$20 + 1 day</div>
                        </div>
                        <div class="mobile-item-action">✈️ FLY</div>
                    </div>
                `;
            }
        });
    } else {
        // Show message about needing to be at airport for inter-city travel
        itemsHtml += `
            <div class="mobile-item disabled">
                <div class="mobile-item-info">
                    <div class="mobile-item-name">Other Cities</div>
                    <div class="mobile-item-price">Must be at airport to travel between cities</div>
                </div>
                <div class="mobile-item-action">🚫</div>
            </div>
        `;
    }
    
    itemsHtml += '</div>';
    modalBody.innerHTML = itemsHtml;
    
    modal.style.display = 'flex';
}

function showMobileChartsModal() {
    MobileModalManager.show('charts', gameState.drugs, drug => gameState.currentPrices[drug.name]);
}

function showMobileChart(drugName) {
    const modal = document.getElementById('mobileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = `📊 ${drugName} PRICE CHART`;
    
    const history = gameState.priceHistory[drugName];
    if (!history || history.length === 0) {
        modalBody.innerHTML = '<div class="mobile-chart-error">No price history available</div>';
        return;
    }
    
    // Find min and max prices for scaling
    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    let chartHtml = '<div class="mobile-chart-container">';
    
    // Chart header with stats
    chartHtml += `
        <div class="mobile-chart-header">
            <div class="chart-stat">Current: $${gameState.currentPrices[drugName]}</div>
            <div class="chart-stat">High: $${maxPrice}</div>
            <div class="chart-stat">Low: $${minPrice}</div>
        </div>
    `;
    
    // Chart data
    chartHtml += '<div class="mobile-chart-data">';
    
    history.forEach((entry, index) => {
        const day = entry.day;
        const price = entry.price;
        const location = getCityAbbreviation(entry.location.split(' - ')[0]);
        
        // Create a simple bar chart
        const barHeight = priceRange > 0 ? Math.floor((price - minPrice) / priceRange * 40) : 20;
        
        // Show trend indicator
        let trend = '';
        if (index > 0) {
            const previousPrice = history[index - 1].price;
            if (price > previousPrice) {
                trend = '↗️';
            } else if (price < previousPrice) {
                trend = '↘️';
            } else {
                trend = '→';
            }
        }
        
        chartHtml += `
            <div class="mobile-chart-row">
                <div class="chart-day">Day ${day}</div>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="height: ${barHeight}px;"></div>
                </div>
                <div class="chart-price">$${price}</div>
                <div class="chart-trend">${trend}</div>
                <div class="chart-location">${location}</div>
            </div>
        `;
    });
    
    chartHtml += '</div>';
    
    // Back button
    chartHtml += `
        <div class="mobile-chart-footer">
            <button class="mobile-confirm-btn" onclick="showMobileChartsModal()">
                ← BACK TO CHARTS
            </button>
        </div>
    `;
    
    chartHtml += '</div>';
    modalBody.innerHTML = chartHtml;
}

function selectMobileItem(itemName, price) {
    mobileState.selectedItem = itemName;
    
    // Auto-default quantity to maximum affordable/available
    if (mobileState.currentAction === 'buy') {
        const maxAffordable = Math.floor(gameState.player.cash / price);
        const inventorySpace = getCurrentMaxInventory() - getCurrentInventorySize();
        mobileState.quantity = Math.min(maxAffordable, inventorySpace);
    } else if (mobileState.currentAction === 'sell') {
        mobileState.quantity = gameState.player.inventory[itemName] || 1;
    }
    
    // Ensure quantity is at least 1
    mobileState.quantity = Math.max(1, mobileState.quantity);
    
    showMobileQuantitySelector(itemName, price);
}

function selectMobileCity(location) {
    closeMobileModal();
    // Parse the location to extract city and district
    const [city, district] = location.split(' - ');
    
    // For local travel, just use the district name
    if (city === gameState.player.location.split(' - ')[0]) {
        processCommand(`travel ${district}`);
    } else {
        // For inter-city travel, use the full city name
        processCommand(`travel ${city}`);
    }
}

function showMobileQuantitySelector(itemName, price) {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    const action = mobileState.currentAction.toUpperCase();
    modalTitle.textContent = `${action} ${itemName}`;
    
    const maxQuantity = mobileState.currentAction === 'sell' ? 
        gameState.player.inventory[itemName] : 
        Math.floor(gameState.player.cash / price);
    
    const inventorySpace = mobileState.currentAction === 'buy' ? 
        getCurrentMaxInventory() - getCurrentInventorySize() : 
        999;
    
    const realMaxQuantity = Math.min(maxQuantity, inventorySpace);
    
    modalBody.innerHTML = `
        <div class="mobile-quantity-selector">
            <div class="mobile-quantity-info">
                <strong>${itemName}</strong><br>
                $${price} each<br>
                ${mobileState.currentAction === 'sell' ? 
                    `You have: ${gameState.player.inventory[itemName]}` : 
                    `Max affordable: ${realMaxQuantity}`}
            </div>
            
            <div class="mobile-quantity-controls">
                <button class="mobile-quantity-btn" onclick="decreaseMobileQuantity()">-</button>
                <input type="number" class="mobile-quantity-input" value="${mobileState.quantity}" min="1" 
                       onchange="updateMobileQuantityFromInput(this.value)" 
                       onkeypress="handleMobileQuantityKeypress(event)">
                <button class="mobile-quantity-btn" onclick="increaseMobileQuantity()">+</button>
                <button class="mobile-quantity-btn" onclick="setMaxMobileQuantity()" style="margin-left: 5px;">Max</button>
            </div>
            
            <div class="mobile-quantity-info">
                <strong>Total: $${price * mobileState.quantity}</strong>
            </div>
            
            <button class="mobile-confirm-btn" onclick="confirmMobileAction()">
                ${action} ${itemName}
            </button>
        </div>
    `;
}

function increaseMobileQuantity() {
    const itemName = mobileState.selectedItem;
    const price = gameState.currentPrices[itemName];
    
    let maxQuantity = mobileState.currentAction === 'sell' ? 
        gameState.player.inventory[itemName] : 
        Math.floor(gameState.player.cash / price);
    
    if (mobileState.currentAction === 'buy') {
        const inventorySpace = getCurrentMaxInventory() - getCurrentInventorySize();
        maxQuantity = Math.min(maxQuantity, inventorySpace);
    }
    
    if (mobileState.quantity < maxQuantity) {
        mobileState.quantity++;
        updateMobileQuantityDisplay();
    }
}

function decreaseMobileQuantity() {
    if (mobileState.quantity > 1) {
        mobileState.quantity--;
        updateMobileQuantityDisplay();
    }
}

function updateMobileQuantityFromInput(value) {
    const quantity = parseInt(value);
    if (!isNaN(quantity) && quantity > 0) {
        const itemName = mobileState.selectedItem;
        const price = gameState.currentPrices[itemName];
        
        let maxQuantity = mobileState.currentAction === 'sell' ? 
            gameState.player.inventory[itemName] : 
            Math.floor(gameState.player.cash / price);
        
        if (mobileState.currentAction === 'buy') {
            const inventorySpace = getCurrentMaxInventory() - getCurrentInventorySize();
            maxQuantity = Math.min(maxQuantity, inventorySpace);
        }
        
        mobileState.quantity = Math.min(Math.max(1, quantity), maxQuantity);
        updateMobileQuantityDisplay();
    }
}

function handleMobileQuantityKeypress(event) {
    if (event.key === 'Enter') {
        confirmMobileAction();
    }
}

function setMaxMobileQuantity() {
    const itemName = mobileState.selectedItem;
    const price = gameState.currentPrices[itemName];
    
    let maxQuantity = mobileState.currentAction === 'sell' ? 
        gameState.player.inventory[itemName] : 
        Math.floor(gameState.player.cash / price);
    
    if (mobileState.currentAction === 'buy') {
        const inventorySpace = getCurrentMaxInventory() - getCurrentInventorySize();
        maxQuantity = Math.min(maxQuantity, inventorySpace);
    }
    
    mobileState.quantity = Math.max(1, maxQuantity);
    updateMobileQuantityDisplay();
}

function updateMobileQuantityDisplay() {
    const inputField = document.querySelector('.mobile-quantity-input');
    const price = gameState.currentPrices[mobileState.selectedItem];
    
    if (inputField) {
        inputField.value = mobileState.quantity;
        
        // Update total
        const totalInfo = inputField.parentElement.nextElementSibling;
        if (totalInfo) {
            totalInfo.innerHTML = `<strong>Total: $${price * mobileState.quantity}</strong>`;
        }
    }
}

function confirmMobileAction() {
    // Extract the drug name part after the emoji (same logic as in buy function)
    const fullName = mobileState.selectedItem;
    const itemName = fullName.split(' ').slice(-1)[0].toLowerCase();
    const command = `${mobileState.currentAction} ${itemName} ${mobileState.quantity}`;
    
    processCommand(command);
    closeMobileModal();
}

function closeMobileModal() {
    const modal = document.getElementById('mobileModal');
    modal.style.display = 'none';
    
    // Reset mobile state
    mobileState.currentAction = null;
    mobileState.selectedItem = null;
    mobileState.quantity = 1;
}

// Add click handlers for existing market and inventory items
function updateMarketDisplay() {
    const marketPrices = document.getElementById('marketPrices');
    marketPrices.innerHTML = '';
    
    gameState.drugs.forEach(drug => {
        const price = gameState.currentPrices[drug.name];
        const basePrice = drug.basePrice;
        const previousPrice = gameState.previousPrices[drug.name];
        
        // Determine price change direction
        let changeIcon = '';
        if (previousPrice) {
            if (price > previousPrice) {
                changeIcon = '<span class="price-up">↑</span>'; // Price increased (green)
            } else if (price < previousPrice) {
                changeIcon = '<span class="price-down">↓</span>'; // Price decreased (red)
            } else {
                changeIcon = '<span class="price-same">↕</span>'; // Price stayed same (yellow)
            }
        }
        
        // Determine if price is extremely high or low
        const priceRatio = price / basePrice;
        let extremeIcon = '';
        if (priceRatio >= 3.0) {
            extremeIcon = '🚀'; // High prices - rocket emoji
        } else if (priceRatio <= 0.5) {
            extremeIcon = '🔻'; // Low prices - red triangle down emoji (good deal)
        }
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'market-item';
        
        // Get current inventory amount
        const currentAmount = gameState.player.inventory[drug.name] || 0;
        
        itemDiv.innerHTML = `
            <div class="market-item-header">
                <span class="item-name">${drug.name}</span>
                <span class="item-indicators">${extremeIcon}</span>
                <span class="item-price">$${price.toLocaleString()}</span>
                <span class="item-trend">${changeIcon}</span>
            </div>
            <div class="market-item-info">
                <span class="inventory-amount">${currentAmount > 0 ? `Own: ${currentAmount}` : ''}</span>
                <div class="clickable-hint">${navigationState.currentMode === 'charts' ? 'Click to view chart' : 'Click to buy'}</div>
            </div>
        `;
        
        // Add click handler for both mobile and desktop
        itemDiv.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                // Mobile: Use modal
                mobileState.currentAction = 'buy';
                selectMobileItem(drug.name, price);
                document.getElementById('mobileModal').style.display = 'flex';
            } else {
                // Desktop: Check if we're in charts mode
                if (navigationState.currentMode === 'charts') {
                    // Show price chart
                    showPriceGraph(drug.name.split(' ').slice(-1)[0].toLowerCase());
                    exitNavigation();
                } else {
                    // Normal buy mode
                    navigationState.isNavigating = true;
                    navigationState.currentMode = 'market';
                    navigationState.selectedIndex = gameState.drugs.findIndex(d => d.name === drug.name);
                    navigationState.actionType = 'buy';
                    navigationState.quantity = 1;
                    navigationState.selectedItem = drug;
                    
                    showNavigationHint('Use +/- or arrow keys to adjust quantity, Enter to confirm, Escape to cancel');
                    NavigationHighlighter.highlightMarketItem(navigationState.selectedIndex);
                    enterQuantityMode();
                    addMessage(`Buy mode activated for ${drug.name}. Use +/- to adjust quantity.`, 'success');
                }
            }
        });
        
        marketPrices.appendChild(itemDiv);
    });
}

function updateInventoryDisplay() {
    const inventoryList = document.getElementById('inventoryList');
    inventoryList.innerHTML = '';
    
    const inventory = Object.keys(gameState.player.inventory);
    
    if (inventory.length === 0) {
        inventoryList.innerHTML = '<div class="empty-inventory">No items</div>';
        return;
    }
    
    inventory.forEach(drug => {
        const amount = gameState.player.inventory[drug];
        const currentPrice = gameState.currentPrices[drug] || 0;
        const totalValue = currentPrice * amount;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item';
        itemDiv.innerHTML = `
            <div class="inventory-item-header">
                <span class="item-name">${drug}</span>
                <span class="item-amount">${amount} units</span>
                <span class="item-value">$${totalValue.toLocaleString()}</span>
            </div>
            <div class="inventory-item-controls">
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="adjustQuantity(this, -1)">-</button>
                    <input type="number" class="qty-input" value="1" min="1" max="${amount}" data-drug="${drug}">
                    <button class="qty-btn" onclick="adjustQuantity(this, 1)">+</button>
                    <button class="sell-btn" onclick="sellDrugDirect('${drug}', this)">SELL</button>
                    <button class="sell-all-btn" onclick="sellAllDrug('${drug}')">SELL ALL</button>
                </div>
            </div>
        `;
        
        // Add click handler for both mobile and desktop
        itemDiv.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                // Mobile: Use modal
                mobileState.currentAction = 'sell';
                const price = gameState.currentPrices[drug];
                selectMobileItem(drug, price);
                document.getElementById('mobileModal').style.display = 'flex';
            } else {
                // Desktop: Check if we're in history mode
                if (navigationState.currentMode === 'history') {
                    // Show purchase history
                    showPurchaseHistory(drug.split(' ').slice(-1)[0].toLowerCase());
                    exitNavigation();
                } else {
                    // Normal sell mode
                    navigationState.isNavigating = true;
                    navigationState.currentMode = 'inventory';
                    navigationState.selectedIndex = inventory.findIndex(d => d === drug);
                    navigationState.actionType = 'sell';
                    navigationState.quantity = 1;
                    navigationState.selectedItem = drug;
                    
                    showNavigationHint('Use +/- or arrow keys to adjust quantity, Enter to confirm, Escape to cancel');
                    NavigationHighlighter.highlightInventoryItem(navigationState.selectedIndex);
                    enterQuantityMode();
                    addMessage(`Sell mode activated for ${drug}. Use +/- to adjust quantity.`, 'success');
                }
            }
        });
        
        inventoryList.appendChild(itemDiv);
    });
}

// Market price generation
function generateMarketPrices() {
    // Store previous prices for comparison
    gameState.previousPrices = { ...gameState.currentPrices };
    
    gameState.drugs.forEach(drug => {
        // 15% chance for price to stay the same
        const staysSame = Math.random() < 0.15;
        let variance;
        
        if (staysSame) {
            // Keep the same price by calculating zero variance
            const currentPrice = gameState.currentPrices[drug.name];
            if (currentPrice) {
                // Calculate what variance would maintain the current price
                const locationMultiplier = getLocationMultiplier(drug.name);
                const baseWithLocation = drug.basePrice * locationMultiplier;
                variance = (currentPrice / baseWithLocation) - 1;
            } else {
                variance = 0; // First time, no variance
            }
        } else {
            // Normal price change
            variance = drug.volatility * (Math.random() - 0.5) * 2;
        }
        
        const locationMultiplier = getLocationMultiplier(drug.name);
        const price = Math.floor(drug.basePrice * (1 + variance) * locationMultiplier);
        gameState.currentPrices[drug.name] = Math.max(price, 1);
        
        // Track price history for graphs
        if (!gameState.priceHistory[drug.name]) {
            gameState.priceHistory[drug.name] = [];
        }
        gameState.priceHistory[drug.name].push({
            day: gameState.player.day,
            price: gameState.currentPrices[drug.name],
            location: gameState.player.location
        });
    });
}

// Location-based flavor text for immersion
function getLocationFlavor(context, weapon = null) {
    const location = gameState.player.location;
    const [city, district] = location.split(' - ');
    
    if (district.toLowerCase().includes('airport')) {
        // Airport locations - higher security, more paranoia
        switch(context) {
            case 'police_encounter':
                return weapon && weapon.name === 'Rubber Chicken' ? 
                    'TSA Agent: "How did you get that through security?! What kind of operation is this?!"' :
                    'TSA Agent: "This is a secure area! How did you get past the checkpoint?!"';
            case 'rubber_chicken_terror':
                return 'The security personnel are baffled by your rubber chicken - this isn\'t in their training manual!';
            case 'mugger_encounter':
                return 'Mugger: "Security cameras everywhere and you\'re still here? You\'re either brave or stupid."';
            default:
                return 'The sterile airport atmosphere makes everything feel more intense...';
        }
    } else if (district.toLowerCase().includes('dock')) {
        // Docks - grittier, more used to weird stuff
        switch(context) {
            case 'police_encounter':
                return weapon && weapon.name === 'Rubber Chicken' ? 
                    'Harbor Patrol: "I\'ve seen smugglers hide drugs in everything, but a rubber chicken? That\'s new."' :
                    'Harbor Patrol: "Another dealer at the docks... when will they learn?"';
            case 'rubber_chicken_terror':
                return 'Even the hardened dock workers stop to stare at your rubber chicken display!';
            case 'mugger_encounter':
                return 'Mugger: "This isn\'t the weirdest thing I\'ve seen at the docks, but it\'s close."';
            default:
                return 'The salty air and creaking ships add to the underground atmosphere...';
        }
    } else if (district.toLowerCase().includes('beach') || district.toLowerCase().includes('hills') || district.toLowerCase().includes('park')) {
        // Upscale areas - more shocked by unconventional weapons
        switch(context) {
            case 'police_encounter':
                return weapon && weapon.name === 'Rubber Chicken' ? 
                    'Officer: "Security! There\'s a person with... poultry?! In THIS neighborhood?!"' :
                    'Officer: "Drug deals in our pristine community? Not on my watch!"';
            case 'rubber_chicken_terror':
                return 'The well-dressed bystanders gasp in horror at your rubber chicken antics!';
            case 'mugger_encounter':
                return 'Mugger: "Rich folks around here... but you\'re something else entirely."';
            default:
                return 'The upscale surroundings make your activities feel more rebellious...';
        }
    } else if (district.toLowerCase().includes('compton') || district.toLowerCase().includes('south') || district.toLowerCase().includes('side')) {
        // Rough neighborhoods - respect the chaos
        switch(context) {
            case 'police_encounter':
                return weapon && weapon.name === 'Rubber Chicken' ? 
                    'Officer: "In all my years patrolling these streets, I\'ve never seen anything like this..."' :
                    'Officer: "Another day, another dealer in the neighborhood..."';
            case 'rubber_chicken_terror':
                return 'Even the street-hardened locals nod with respect - "Now THAT\'S a power move!"';
            case 'mugger_encounter':
                return 'Mugger: "I respect the hustle, but that rubber chicken? That\'s next level crazy."';
            default:
                return 'The rough streets acknowledge your presence with knowing nods...';
        }
    }
    
    // Default urban flavor
    switch(context) {
        case 'police_encounter':
            return weapon && weapon.name === 'Rubber Chicken' ? 
                'Officer: "What kind of psychological warfare is this?!"' :
                'Officer: "Stop right there! You\'re under arrest!"';
        case 'rubber_chicken_terror':
            return 'Passersby stop and stare at your rubber chicken in confused terror!';
        case 'mugger_encounter':
            return 'Mugger: "This city keeps getting weirder every day..."';
        default:
            return 'The urban environment buzzes with underground energy...';
    }
}

// Location price multipliers
function getLocationMultiplier(drugName) {
    const locationMultipliers = {
        // New York districts
        'New York - JFK Airport': { 'Cocaine': 1.4, 'Heroin': 1.3, 'Ice': 1.2, 'Opium': 1.1 },
        'New York - Brooklyn Docks': { 'Weed': 0.8, 'Hash': 1.2, 'Heroin': 0.9, 'Crack': 0.8 },
        'New York - Times Square': { 'Cocaine': 1.5, 'Speed': 1.3, 'Molly': 1.6, 'Special K': 1.4 },
        'New York - Central Park': { 'Mushrooms': 0.7, 'Acid': 0.8, 'Weed': 1.1, 'Peyote': 0.9 },
        
        // Los Angeles districts
        'Los Angeles - LAX Airport': { 'Cocaine': 1.6, 'Molly': 1.4, 'Speed': 1.3, 'Special K': 1.2 },
        'Los Angeles - Hollywood Hills': { 'Cocaine': 1.8, 'Molly': 2.0, 'Speed': 1.4, 'Special K': 1.6 },
        'Los Angeles - Venice Beach': { 'Weed': 0.6, 'Hash': 0.8, 'Acid': 1.2, 'Mushrooms': 0.9 },
        'Los Angeles - Compton': { 'Heroin': 0.7, 'Speed': 0.8, 'Cocaine': 0.9, 'Crack': 0.6 },
        
        // Chicago districts
        'Chicago - O\'Hare Airport': { 'Cocaine': 1.7, 'Heroin': 1.2, 'Speed': 1.1, 'Ice': 1.3 },
        'Chicago - The Loop': { 'Cocaine': 1.9, 'Heroin': 1.4, 'Special K': 1.5, 'Opium': 1.3 },
        'Chicago - Wicker Park': { 'Acid': 1.1, 'Mushrooms': 1.3, 'Hash': 0.9, 'Molly': 1.2 },
        'Chicago - South Side': { 'Heroin': 0.6, 'Speed': 0.7, 'Weed': 0.8, 'Crack': 0.5 },
        
        // Miami districts
        'Miami - Miami Airport': { 'Cocaine': 1.5, 'Molly': 1.8, 'Special K': 1.4, 'Ice': 1.2 },
        'Miami - South Beach': { 'Cocaine': 1.6, 'Molly': 2.2, 'Speed': 1.3, 'Special K': 1.5 },
        'Miami - Little Havana': { 'Weed': 0.5, 'Hash': 0.7, 'Heroin': 0.8, 'Opium': 0.9 },
        'Miami - Biscayne Bay': { 'Cocaine': 1.4, 'Acid': 1.2, 'Mushrooms': 1.1, 'Ice': 1.3 },
        
        // Detroit districts
        'Detroit - Detroit Airport': { 'Heroin': 1.1, 'Speed': 0.9, 'Weed': 1.0, 'Crack': 0.8 },
        'Detroit - Corktown': { 'Heroin': 0.6, 'Speed': 0.7, 'Weed': 0.9, 'Crack': 0.5 },
        'Detroit - Greektown': { 'Hash': 1.1, 'Acid': 1.2, 'Cocaine': 1.3, 'Ice': 1.1 },
        'Detroit - Belle Isle': { 'Mushrooms': 0.8, 'Weed': 0.7, 'Peyote': 1.0, 'Opium': 1.2 },
        
        // Boston districts
        'Boston - Logan Airport': { 'Cocaine': 1.8, 'Heroin': 1.3, 'Speed': 1.1, 'Special K': 1.2 },
        'Boston - Back Bay': { 'Cocaine': 2.1, 'Heroin': 1.5, 'Speed': 1.2, 'Special K': 1.4 },
        'Boston - North End': { 'Hash': 0.8, 'Heroin': 0.7, 'Weed': 0.9, 'Opium': 0.8 },
        'Boston - Fenway': { 'Acid': 1.1, 'Mushrooms': 1.2, 'Speed': 0.9, 'Molly': 1.3 }
    };
    
    const locationData = locationMultipliers[gameState.player.location] || {};
    // Extract the clean drug name (without emoji) for multiplier lookup
    const cleanDrugName = drugName.split(' ').slice(-1)[0];
    return locationData[cleanDrugName] || 1.0;
}

// Character helper functions
function getRandomCharacter(category) {
    const characters = gameCharacters[category];
    return characters[Math.floor(Math.random() * characters.length)];
}

function getCharacterDialogue(character, situation) {
    const dialogues = {
        tough: {
            arrest: "Freeze! You're under arrest!",
            bribe: "You trying to bribe me? That's another charge!",
            search: "I'm gonna search you real good, punk.",
            rubber_chicken: "I can handle guns, but what even IS this?! I don't get paid enough for this level of weird!"
        },
        corrupt: {
            arrest: "Well, well, what do we have here?",
            bribe: "Maybe we can work something out...",
            search: "This could go easy or hard for you.",
            rubber_chicken: "I take bribes but I draw the line at rubber chickens! That's just... disturbing!"
        },
        smart: {
            arrest: "I've been watching you for weeks.",
            bribe: "You think I'm stupid? Nice try.",
            search: "Evidence doesn't lie, friend.",
            rubber_chicken: "Is this some kind of code? A distraction? Performance art?! I'm overthinking this..."
        },
        by_the_book: {
            arrest: "You're under arrest by the book!",
            bribe: "I'm an honest cop - no bribes!",
            search: "Following proper search procedure.",
            rubber_chicken: "There's no protocol for this! What am I supposed to write in my report?!"
        },
        smooth: {
            deal: "I got what you need, quality stuff.",
            warning: "Word on the street is cops are hot today.",
            tip: "Psst, prices are about to drop on that good stuff."
        },
        intimidating: {
            threat: "You owe me money, and I always collect.",
            demand: "Pay up or things get ugly.",
            warning: "This is your only warning."
        },
        talkative: {
            info: "Did you hear about the big bust downtown?",
            tip: "My cousin's friend said prices are crazy in Uptown.",
            gossip: "Everyone's talking about some new player in town."
        },
        threatening: {
            demand: "Time's up! Where's my money?",
            warning: "Cross me and you'll regret it.",
            intimidate: "I know where you live..."
        },
        helpful: {
            offer: "You look hurt, need some patching up?",
            advice: "Stay safe out there, it's getting dangerous.",
            treatment: "This will fix you right up."
        }
    };
    
    const typeDialogues = dialogues[character.type];
    if (typeDialogues && typeDialogues[situation]) {
        return typeDialogues[situation];
    }
    
    return "..."; // Default dialogue
}

// Random events system
function triggerRandomEvent(headlinesSoundPlayed = false) {
    const events = [
        { type: 'police', weight: 10 },
        { type: 'mugging', weight: 8 },
        { type: 'market_surge', weight: 15 },
        { type: 'market_crash', weight: 15 },
        { type: 'drug_bust', weight: 12 },
        { type: 'police_raid', weight: 8 },
        { type: 'supply_shortage', weight: 10 },
        { type: 'addicts', weight: 8 }, // Authentic Dope Wars addicts event
        { type: 'police_dog', weight: 8 },
        { type: 'loan_shark', weight: 8 },
        { type: 'find_cash', weight: 12 },
        { type: 'health_issue', weight: 4 },
        { type: 'dealer_encounter', weight: 6 },
        { type: 'informant_tip', weight: 5 },
        { type: 'nothing', weight: 4 }
    ];
    
    const totalWeight = events.reduce((sum, event) => sum + event.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let event of events) {
        random -= event.weight;
        if (random <= 0) {
            return executeRandomEvent(event.type, headlinesSoundPlayed);
        }
    }
    
    return false; // No event triggered
}

// Execute random events
function executeRandomEvent(eventType, headlinesSoundPlayed = false) {
    // Market-related events that should trigger headlines sound
    const marketEvents = ['market_surge', 'market_crash', 'drug_bust', 'supply_shortage'];
    const isMarketEvent = marketEvents.includes(eventType);
    
    switch (eventType) {
        case 'police':
            handlePoliceEvent();
            break;
        case 'mugging':
            handleMuggingEvent();
            break;
        case 'market_surge':
            handleMarketSurgeEvent(headlinesSoundPlayed);
            break;
        case 'market_crash':
            handleMarketCrashEvent(headlinesSoundPlayed);
            break;
        case 'drug_bust':
            handleDrugBustEvent(headlinesSoundPlayed);
            break;
        case 'police_raid':
            handlePoliceRaidEvent(headlinesSoundPlayed);
            break;
        case 'supply_shortage':
            handleSupplyShortageEvent(headlinesSoundPlayed);
            break;
        case 'addicts':
            handleAddictsEvent(headlinesSoundPlayed);
            break;
        case 'police_dog':
            handlePoliceDogEvent();
            break;
        case 'loan_shark':
            handleLoanSharkEvent();
            break;
        case 'find_cash':
            handleFindCashEvent();
            break;
        case 'health_issue':
            handleHealthIssueEvent();
            break;
        case 'dealer_encounter':
            handleDealerEncounter();
            break;
        case 'informant_tip':
            handleInformantTip();
            break;
        case 'nothing':
            // No event
            break;
    }
    
    return isMarketEvent;
}

// Police event
function handlePoliceEvent() {
    playSound('siren');
    const officer = getRandomCharacter('officers');
    addMessage(`🚔 ${officer.emoji} ${officer.name} spotted you!`, 'event');
    
    const hasInventory = Object.keys(gameState.player.inventory).length > 0;
    const hasCocaine = gameState.player.inventory['Cocaine'] > 0;
    const hasHeroin = gameState.player.inventory['Heroin'] > 0;
    
    if (!hasInventory) {
        addMessage(`${officer.name}: "${getCharacterDialogue(officer, 'search')}"`, 'event');
        addMessage('You have nothing illegal on you. The officer lets you go.', 'success');
        return;
    }
    
    // Special handling for high-value drugs
    if (hasCocaine || hasHeroin) {
        addMessage(`${officer.name}: "We've been watching you. You're carrying serious contraband!"`, 'event');
        // Higher chance of arrest with valuable drugs
        if (Math.random() < 0.7) {
            addMessage('The officer calls for backup! This is serious!', 'error');
            playSound('siren');
        }
    }
    
    // If player has a weapon, show combat interface
    if (gameState.player.weapon) {
        addMessage(`You grip your ${gameState.player.weapon.name} tightly...`, 'event');
        showCombatInterface(officer, 'police');
        return;
    }
    
    // Random outcome based on officer type
    const outcome = Math.random();
    let arrestChance = 0.3;
    let bribeChance = 0.6;
    
    if (officer.type === 'tough') {
        arrestChance = 0.5;
        bribeChance = 0.7;
    } else if (officer.type === 'corrupt') {
        arrestChance = 0.1;
        bribeChance = 0.8;
    } else if (officer.type === 'smart') {
        arrestChance = 0.4;
        bribeChance = 0.5;
    }
    
    if (outcome < arrestChance) {
        // Arrest
        addMessage(`${officer.name}: "${getCharacterDialogue(officer, 'arrest')}"`, 'event');
        addMessage('You were arrested! All your inventory is confiscated.', 'error');
        gameState.player.inventory = {};
        gameState.player.day += 3;
        const fine = Math.floor(gameState.player.cash * 0.2);
        gameState.player.cash -= fine;
        addMessage(`You spent 3 days in jail and paid a $${fine} fine.`, 'error');
        playSound('wasted');
    } else if (outcome < bribeChance) {
        // Bribe option
        const bribe = Math.floor(200 + Math.random() * 300);
        addMessage(`${officer.name}: "${getCharacterDialogue(officer, 'bribe')}"`, 'event');
        if (gameState.player.cash >= bribe && officer.type !== 'by_the_book') {
            gameState.player.cash -= bribe;
            addMessage(`You paid a $${bribe} bribe and avoided arrest.`, 'success');
            playSound('money'); // Bribe money sound
        } else if (officer.type === 'by_the_book') {
            addMessage('This officer is too honest to bribe! You tried to run but were caught!', 'error');
            loseRandomInventory(0.5);
            playSound('jaildoor'); // Arrested sound
        } else {
            addMessage('You tried to run but were caught! Lost some inventory.', 'error');
            loseRandomInventory(0.5);
            playSound('jaildoor'); // Arrested sound
        }
    } else {
        // Escape
        addMessage('You managed to slip away while the officer was distracted!', 'success');
    }
}

// Combat interface for player choices
function showCombatInterface(opponent, opponentType) {
    const weapon = gameState.player.weapon;
    const modal = document.getElementById('mobileModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    const titles = {
        'police': '🚔 POLICE ENCOUNTER',
        'mugger': '💰 MUGGER ENCOUNTER'
    };
    
    modalTitle.textContent = titles[opponentType] || 'COMBAT';
    
    let combatHtml = `
        <div class="combat-interface">
            <div class="combat-situation">
                <p><strong>${opponent.emoji} ${opponent.name}</strong> confronts you!</p>
                <p>You have a ${weapon.name} in your hands.</p>
                <p>What do you do?</p>
            </div>
            <div class="combat-actions">
                <button class="mobile-item combat-action" onclick="chooseCombatAction('fight', '${opponentType}')">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">⚔️ Fight</div>
                        <div class="mobile-item-price">Use your ${weapon.name}</div>
                    </div>
                </button>
                <button class="mobile-item combat-action" onclick="chooseCombatAction('run', '${opponentType}')">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">🏃 Run</div>
                        <div class="mobile-item-price">Try to escape</div>
                    </div>
                </button>`;
    
    if (opponentType === 'police') {
        combatHtml += `
                <button class="mobile-item combat-action" onclick="chooseCombatAction('surrender', '${opponentType}')">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">🙌 Surrender</div>
                        <div class="mobile-item-price">Give up peacefully</div>
                    </div>
                </button>`;
        
        if (gameState.player.cash >= 200) {
            combatHtml += `
                <button class="mobile-item combat-action" onclick="chooseCombatAction('bribe', '${opponentType}')">
                    <div class="mobile-item-info">
                        <div class="mobile-item-name">💵 Bribe</div>
                        <div class="mobile-item-price">Offer money</div>
                    </div>
                </button>`;
        }
    }
    
    combatHtml += `
            </div>
        </div>
    `;
    
    modalBody.innerHTML = combatHtml;
    modal.style.display = 'flex';
    
    // Store opponent data for combat resolution
    gameState.currentCombatOpponent = opponent;
    gameState.currentCombatType = opponentType;
}

function chooseCombatAction(action, opponentType) {
    closeMobileModal();
    
    const opponent = gameState.currentCombatOpponent;
    const weapon = gameState.player.weapon;
    
    switch (action) {
        case 'fight':
            if (opponentType === 'police') {
                handleWeaponCombat(opponent);
            } else {
                handleMuggerCombat(opponent);
            }
            break;
            
        case 'run':
            handleCombatRun(opponent, opponentType);
            break;
            
        case 'surrender':
            handleCombatSurrender(opponent, opponentType);
            break;
            
        case 'bribe':
            handleCombatBribe(opponent, opponentType);
            break;
    }
    
    // Clean up
    gameState.currentCombatOpponent = null;
    gameState.currentCombatType = null;
}

function handleCombatRun(opponent, opponentType) {
    addMessage('🏃 You attempt to run away!', 'event');
    playSound('footstep');
    
    const escapeChance = Math.random();
    let successChance = 0.4;
    
    if (opponentType === 'police') {
        successChance = 0.3; // Harder to escape police
        if (opponent.type === 'smart') {
            successChance = 0.2; // Smart officers are harder to escape
        }
    } else {
        successChance = 0.6; // Easier to escape muggers
    }
    
    if (escapeChance < successChance) {
        addMessage('You successfully escaped!', 'success');
        playSound('run');
    } else {
        addMessage('You were caught while trying to escape!', 'error');
        if (opponentType === 'police') {
            // Worse consequences for running from police
            addMessage('The officer is angry that you tried to run!', 'error');
            gameState.player.inventory = {};
            gameState.player.day += 4;
            const fine = Math.floor(gameState.player.cash * 0.3);
            gameState.player.cash -= fine;
            addMessage(`You spent 4 days in jail and paid a $${fine} fine.`, 'error');
            playSound('wasted');
        } else {
            // Mugger catches you
            const cashLoss = Math.floor(gameState.player.cash * 0.15 + Math.random() * 150);
            gameState.player.cash = Math.max(0, gameState.player.cash - cashLoss);
            addMessage(`${opponent.name} caught you and took $${cashLoss}!`, 'error');
            playSound('hrdpunch');
            if (Math.random() < 0.4) {
                loseRandomInventory(0.3);
            }
        }
    }
}

function handleCombatSurrender(opponent, opponentType) {
    addMessage('🙌 You surrender peacefully.', 'event');
    
    if (opponentType === 'police') {
        addMessage(`${opponent.name}: "Smart choice. You're still under arrest."`, 'event');
        addMessage('You were arrested, but your cooperation is noted.', 'error');
        gameState.player.inventory = {};
        gameState.player.day += 2; // Less jail time for surrendering
        const fine = Math.floor(gameState.player.cash * 0.15);
        gameState.player.cash -= fine;
        addMessage(`You spent 2 days in jail and paid a $${fine} fine.`, 'error');
        playSound('jaildoor');
    }
}

function handleCombatBribe(opponent, opponentType) {
    const bribe = Math.floor(200 + Math.random() * 300);
    
    if (opponentType === 'police') {
        addMessage(`💵 You offer ${opponent.name} a $${bribe} bribe.`, 'event');
        
        if (opponent.type === 'by_the_book') {
            addMessage(`${opponent.name}: "Are you trying to bribe me? That's another charge!"`, 'event');
            addMessage('The honest officer is offended! You\'re in more trouble now.', 'error');
            gameState.player.inventory = {};
            gameState.player.day += 4;
            const fine = Math.floor(gameState.player.cash * 0.25);
            gameState.player.cash -= fine;
            addMessage(`You spent 4 days in jail and paid a $${fine} fine.`, 'error');
            playSound('wasted');
        } else if (opponent.type === 'corrupt' || Math.random() < 0.7) {
            if (gameState.player.cash >= bribe) {
                gameState.player.cash -= bribe;
                addMessage(`${opponent.name} accepts the bribe and lets you go.`, 'success');
                playSound('money');
            } else {
                addMessage('You don\'t have enough cash for the bribe!', 'error');
                addMessage('The officer arrests you for wasting his time.', 'error');
                gameState.player.inventory = {};
                gameState.player.day += 3;
                const fine = Math.floor(gameState.player.cash * 0.2);
                gameState.player.cash -= fine;
                addMessage(`You spent 3 days in jail and paid a $${fine} fine.`, 'error');
                playSound('wasted');
            }
        } else {
            addMessage(`${opponent.name}: "You think you can buy your way out? Think again!"`, 'event');
            addMessage('The officer rejects your bribe and arrests you.', 'error');
            gameState.player.inventory = {};
            gameState.player.day += 3;
            const fine = Math.floor(gameState.player.cash * 0.2);
            gameState.player.cash -= fine;
            addMessage(`You spent 3 days in jail and paid a $${fine} fine.`, 'error');
            playSound('wasted');
        }
    }
}

// Weapon combat system
function handleWeaponCombat(officer) {
    const weapon = gameState.player.weapon;
    addMessage(`💥 You draw your ${weapon.name}!`, 'event');
    
    // Play weapon sound
    playSound(weapon.hitSound);
    
    // Special Rubber Chicken mechanics - 25% instant win chance
    if (weapon.name === 'Rubber Chicken' && Math.random() < 0.25) {
        addMessage(getLocationFlavor('police_encounter', weapon), 'event');
        addMessage('The officer is so disturbed by the rubber chicken that he flees in terror!', 'success');
        addMessage(getLocationFlavor('rubber_chicken_terror'), 'event');
        addMessage('Your reputation as "The Chicken Dealer" grows stronger...', 'event');
        playSound(weapon.hitSoundHit);
        playSound('copchase'); // Police chase sound for escaping
        return; // Instant win - skip normal combat
    }
    
    // Combat calculation based on weapon damage and officer type
    let playerAdvantage = weapon.damage;
    let officerAdvantage = 3; // Base officer strength
    
    // Rubber Chicken psychological warfare bonus
    if (weapon.name === 'Rubber Chicken') {
        const rubberChickenDialogue = getCharacterDialogue(officer.type, 'rubber_chicken');
        addMessage(`${officer.name}: "${rubberChickenDialogue}"`, 'event');
        officerAdvantage = Math.max(1, officerAdvantage - 2); // Psychological confusion
    }
    
    if (officer.type === 'tough') {
        officerAdvantage = 5;
        if (weapon.name === 'Rubber Chicken') {
            officerAdvantage = Math.max(2, officerAdvantage - 2); // Even tough officers are confused
        }
    } else if (officer.type === 'strong') {
        officerAdvantage = 6;
    } else if (officer.type === 'smart') {
        officerAdvantage = 4;
        // Smart officers are more likely to call for backup
        if (Math.random() < 0.5) {
            addMessage(`${officer.name} calls for backup on his radio!`, 'event');
            playSound('siren');
            officerAdvantage += 2;
        }
        
        if (weapon.name === 'Rubber Chicken') {
            officerAdvantage = Math.max(1, officerAdvantage - 1); // Overthinking the chicken
        }
    }
    
    const combatOutcome = Math.random() * (playerAdvantage + officerAdvantage);
    
    if (combatOutcome < playerAdvantage) {
        // Player wins
        addMessage(`Your ${weapon.name} intimidates ${officer.name}!`, 'success');
        playSound(weapon.hitSoundHit);
        
        if (weapon.name === 'Pea Shooter') {
            addMessage(`${officer.name}: "Is that... a pea shooter? Are you serious?"`, 'event');
            addMessage('The officer laughs so hard he lets you go!', 'success');
        } else if (weapon.name === 'Rubber Chicken') {
            addMessage(`${officer.name}: "Oh no... not THE rubber chicken... I've heard stories..."`, 'event');
            addMessage('The officer backs away slowly, clearly traumatized by your reputation!', 'success');
            addMessage('Word spreads: "The Chicken Dealer" strikes again...', 'event');
        } else {
            addMessage(`${officer.name} backs away slowly...`, 'event');
            addMessage('You managed to escape!', 'success');
            playSound('copchase'); // Police chase sound for escaping
        }
        
        // Small chance to lose weapon in combat
        if (Math.random() < 0.1) {
            addMessage(`Your ${weapon.name} was damaged in the encounter!`, 'error');
            gameState.player.weapon = null;
            playSound('clang');
        }
        
    } else {
        // Officer wins
        addMessage(`${officer.name} is not intimidated by your ${weapon.name}!`, 'error');
        playSound('cophit');
        
        if (weapon.name === 'Rubber Chicken') {
            addMessage(`${officer.name}: "I don't care if you're the legendary Chicken Dealer! I'm not afraid of poultry!"`, 'event');
            addMessage('The officer grabs the rubber chicken and snaps it in half!', 'error');
            addMessage('Your reputation takes a hit... the chicken has failed you.', 'error');
        } else if (officer.type === 'tough') {
            addMessage(`${officer.name}: "You think that toy scares me? I eat punks like you for breakfast!"`, 'event');
            addMessage('The officer easily overpowers you!', 'error');
        } else {
            addMessage(`${officer.name}: "Drop the weapon! You're under arrest!"`, 'event');
            addMessage('The officer expertly disarms you!', 'error');
        }
        
        // Worse consequences for attempting to fight
        gameState.player.inventory = {};
        gameState.player.day += 5; // More jail time
        const fine = Math.floor(gameState.player.cash * 0.4); // Bigger fine
        gameState.player.cash -= fine;
        
        // Confiscate weapon
        if (gameState.player.weapon) {
            addMessage(`${officer.name} confiscates your ${gameState.player.weapon.name}!`, 'error');
            gameState.player.weapon = null;
        }
        
        addMessage(`You spent 5 days in jail and paid a $${fine} fine for resisting arrest.`, 'error');
        playSound('wasted');
    }
}

// Mugging event
function handleMuggingEvent() {
    playSound('mugged'); // Authentic mugging sound
    const mugger = getRandomCharacter('dealers');
    addMessage(`💰 ${mugger.emoji} ${mugger.name} approaches you menacingly!`, 'event');
    
    // If player has a weapon, show combat interface
    if (gameState.player.weapon) {
        showCombatInterface(mugger, 'mugger');
        return;
    }
    
    const cashLoss = Math.floor(gameState.player.cash * 0.1 + Math.random() * 100);
    gameState.player.cash = Math.max(0, gameState.player.cash - cashLoss);
    
    if (mugger.type === 'aggressive') {
        addMessage(`${mugger.name}: "Hand over your cash or else!"`, 'event');
        addMessage(`You lost $${cashLoss} to the mugger.`, 'error');
        playSound('hrdpunch'); // Getting mugged sound
        // More likely to lose inventory
        if (Math.random() < 0.5) {
            loseRandomInventory(0.3);
        }
    } else if (mugger.type === 'smooth') {
        addMessage(`${mugger.name}: "Nothing personal, just business."`, 'event');
        addMessage(`You lost $${cashLoss} in a surprisingly polite mugging.`, 'error');
        playSound('youhit'); // Standard hit sound
        // Less likely to lose inventory
        if (Math.random() < 0.2) {
            loseRandomInventory(0.1);
        }
    } else {
        addMessage(`${mugger.name}: "You shouldn't be walking around here alone."`, 'event');
        addMessage(`You lost $${cashLoss} to the mugger.`, 'error');
        playSound('youhit');
        // Standard chance to lose inventory
        if (Math.random() < 0.3) {
            loseRandomInventory(0.2);
        }
    }
}

// Mugger combat system
function handleMuggerCombat(mugger) {
    const weapon = gameState.player.weapon;
    addMessage(`💥 You brandish your ${weapon.name} at the mugger!`, 'event');
    
    // Play weapon sound
    playSound(weapon.hitSound);
    
    // Special Rubber Chicken mechanics - 25% instant win chance
    if (weapon.name === 'Rubber Chicken' && Math.random() < 0.25) {
        addMessage(getLocationFlavor('mugger_encounter'), 'event');
        addMessage('The mugger runs away in absolute terror!', 'success');
        addMessage(getLocationFlavor('rubber_chicken_terror'), 'event');
        addMessage('Your reputation as "The Chicken Dealer" spreads through the streets...', 'event');
        playSound(weapon.hitSoundHit);
        return; // Instant win - skip normal combat
    }
    
    // Combat calculation - muggers are generally easier than police
    let playerAdvantage = weapon.damage + 1; // Slight advantage against muggers
    let muggerAdvantage = 2; // Base mugger strength
    
    // Rubber Chicken psychological warfare bonus
    if (weapon.name === 'Rubber Chicken') {
        addMessage(`${mugger.name}: "Yo, what's with the rubber chicken? That's messed up..."`, 'event');
        muggerAdvantage = Math.max(1, muggerAdvantage - 1); // Even criminals are confused
    }
    
    if (mugger.type === 'aggressive') {
        muggerAdvantage = 4; // Aggressive muggers are tougher
    } else if (mugger.type === 'intimidating') {
        muggerAdvantage = 3;
    }
    
    const combatOutcome = Math.random() * (playerAdvantage + muggerAdvantage);
    
    if (combatOutcome < playerAdvantage) {
        // Player wins
        addMessage(`Your ${weapon.name} scares off ${mugger.name}!`, 'success');
        playSound(weapon.hitSoundHit);
        
        if (weapon.name === 'Pea Shooter') {
            addMessage(`${mugger.name}: "A pea shooter? Really? Fine, I'll go find an easier target."`, 'event');
        } else if (weapon.name === 'Rubber Chicken') {
            addMessage(`${mugger.name}: "Wait... you're THE Chicken Dealer?! I heard about you on the streets!"`, 'event');
            addMessage('The mugger bows respectfully before fleeing in terror!', 'success');
            addMessage('Your legend grows stronger in the underworld...', 'event');
        } else {
            addMessage(`${mugger.name}: "Not worth the trouble..." *runs away*`, 'event');
        }
        
        // Sometimes the mugger drops money
        if (Math.random() < 0.3) {
            const foundCash = Math.floor(50 + Math.random() * 150);
            gameState.player.cash += foundCash;
            addMessage(`The mugger dropped $${foundCash} while fleeing!`, 'success');
            playSound('cashreg');
        }
        
    } else {
        // Mugger wins
        addMessage(`${mugger.name} is not intimidated by your ${weapon.name}!`, 'error');
        playSound('hrdpunch');
        
        if (mugger.type === 'aggressive') {
            addMessage(`${mugger.name}: "Nice try, but I've seen worse! Now you pay double!"`, 'event');
            const cashLoss = Math.floor(gameState.player.cash * 0.2 + Math.random() * 200);
            gameState.player.cash = Math.max(0, gameState.player.cash - cashLoss);
            addMessage(`You lost $${cashLoss} to the angry mugger!`, 'error');
            
            // More likely to lose inventory and weapon
            if (Math.random() < 0.6) {
                loseRandomInventory(0.4);
            }
            if (Math.random() < 0.3) {
                addMessage(`${mugger.name} takes your ${weapon.name} as payment!`, 'error');
                gameState.player.weapon = null;
            }
        } else {
            addMessage(`${mugger.name}: "Should've just given me the money quietly."`, 'event');
            const cashLoss = Math.floor(gameState.player.cash * 0.15 + Math.random() * 150);
            gameState.player.cash = Math.max(0, gameState.player.cash - cashLoss);
            addMessage(`You lost $${cashLoss} to the mugger!`, 'error');
            
            // Standard chance to lose inventory
            if (Math.random() < 0.4) {
                loseRandomInventory(0.3);
            }
        }
    }
}

// Market surge event
function handleMarketSurgeEvent(headlinesSoundPlayed = false) {
    const drug = getRandomDrug();
    if (!drug) return; // Safety check
    
    const multiplier = 1.5 + Math.random() * 1.5;
    gameState.currentPrices[drug.name] = Math.floor(gameState.currentPrices[drug.name] * multiplier);
    
    const surgeReasons = [
        'Celebrity overdose drives up demand',
        'Supply chain disruption hits the streets',
        'New trendy club scene drives demand',
        'International shortage affects local prices',
        'Quality batch rumors spread through the underground',
        'Competitor arrested - market demand shifts',
        'Underground DJ endorses product - demand explodes',
        'Legendary dealer "Slick Eddie" surfaces again - market goes wild',
        'Word spreads about the mysterious "Chicken Dealer" - prices spike'
    ];
    
    const reason = surgeReasons[Math.floor(Math.random() * surgeReasons.length)];
    addMessage(`🚀 ${reason} - ${drug.name} prices skyrocket!`, 'event');
    if (!headlinesSoundPlayed) {
        playSound('headlines'); // News headlines sound for market updates
    }
}

// Market crash event
function handleMarketCrashEvent(headlinesSoundPlayed = false) {
    // Get random drug excluding high-value drugs (Cocaine, Heroin) that don't crash
    const crashableDrugs = gameState.drugs.filter(d => 
        !d.name.includes('Cocaine') && !d.name.includes('Heroin')
    );
    
    if (crashableDrugs.length === 0) return; // Safety check
    
    const drug = crashableDrugs[Math.floor(Math.random() * crashableDrugs.length)];
    
    const multiplier = 0.3 + Math.random() * 0.4;
    gameState.currentPrices[drug.name] = Math.floor(gameState.currentPrices[drug.name] * multiplier);
    
    addMessage(`🔻 Market crash! ${drug.name} prices have plummeted!`, 'event');
    if (!headlinesSoundPlayed) {
        playSound('headlines'); // News headlines sound for market updates
    }
}

// Drug bust event - prices surge due to reduced supply (authentic 4x multiplier)
function handleDrugBustEvent(headlinesSoundPlayed = false) {
    const drug = getRandomDrug();
    if (!drug) return; // Safety check
    
    const multiplier = 4.0; // Authentic Dope Wars 4x multiplier for police busts
    gameState.currentPrices[drug.name] = Math.floor(gameState.currentPrices[drug.name] * multiplier);
    
    const operations = [
        { name: 'Operation Rubber Duck', description: 'Major drug bust shuts down supplier!' },
        { name: 'Operation Blue Thunder', description: 'Police seize huge shipment at border!' },
        { name: 'Operation Clean Sweep', description: 'DEA raids major distribution center!' },
        { name: 'Operation Deep Current', description: 'Coast Guard intercepts smuggling operation!' },
        { name: 'Operation Silent Partner', description: 'FBI breaks up trafficking ring!' },
        { name: 'Operation Chicken Run', description: 'Bizarre weapon cache found during raid - authorities baffled!' }
    ];
    
    const operation = operations[Math.floor(Math.random() * operations.length)];
    addMessage(`🚨 ${operation.name}: ${operation.description}`, 'event');
    addMessage(`🚀 ${drug.name} supply compromised - prices skyrocket!`, 'event');
    
    // Special easter egg for Operation Rubber Duck
    if (operation.name === 'Operation Rubber Duck') {
        addMessage('Authorities report finding "unusual poultry-related evidence" at the scene...', 'event');
    }
    if (!headlinesSoundPlayed) {
        playSound('headlines'); // News headlines sound
    }
}

// Police raid event - specific to location, affects multiple drugs
function handlePoliceRaidEvent(headlinesSoundPlayed = false) {
    const raidTypes = [
        'Police raid local dealers!',
        'SWAT team hits drug house!',
        'Narcotics unit sweeps the area!',
        'Task force targets street dealers!',
        'Vice squad cracks down!'
    ];
    
    const raidType = raidTypes[Math.floor(Math.random() * raidTypes.length)];
    addMessage(`🚔 ${raidType} Supply is tight!`, 'event');
    
    // Affect 2-3 random drugs with moderate price increases
    const numDrugs = 2 + Math.floor(Math.random() * 2);
    const affectedDrugs = [];
    
    for (let i = 0; i < numDrugs; i++) {
        const drug = getRandomDrug();
        if (!drug) continue; // Safety check
        
        if (!affectedDrugs.includes(drug.name)) {
            affectedDrugs.push(drug.name);
            const multiplier = 1.5 + Math.random() * 1.0; // 1.5x to 2.5x increase
            gameState.currentPrices[drug.name] = Math.floor(gameState.currentPrices[drug.name] * multiplier);
        }
    }
    
    if (affectedDrugs.length > 0) {
        addMessage(`Prices up for: ${affectedDrugs.join(', ')}`, 'event');
    }
    
    if (!headlinesSoundPlayed) {
        playSound('headlines'); // News headlines sound
    }
}

// Supply shortage event - specific drug becomes very expensive
function handleSupplyShortageEvent(headlinesSoundPlayed) {
    const drug = getRandomDrug();
    if (!drug) return; // Safety check
    
    const multiplier = 3.0 + Math.random() * 2.0; // 3x to 5x price increase
    
    const shortageTypes = [
        'Lab explosion cuts supply!',
        'Cartel war disrupts shipments!',
        'Border crackdown stops imports!',
        'Key supplier arrested!',
        'Manufacturing equipment seized!',
        'Colombian connection severed!',
        'Processing plant raided!',
        'Smuggling tunnel discovered!'
    ];
    
    const shortageType = shortageTypes[Math.floor(Math.random() * shortageTypes.length)];
    addMessage(`🔥 ${shortageType} ${drug.name} in short supply!`, 'event');
    
    gameState.currentPrices[drug.name] = Math.floor(gameState.currentPrices[drug.name] * multiplier);
    
    if (!headlinesSoundPlayed) {
        playSound('headlines'); // News headlines sound
    }
}

// Addicts event - authentic Dope Wars 8x multiplier for desperate buyers
function handleAddictsEvent(headlinesSoundPlayed) {
    const drug = getRandomDrug();
    if (!drug) return; // Safety check
    
    const multiplier = 8.0; // Authentic Dope Wars 8x multiplier for addicts
    
    gameState.currentPrices[drug.name] = Math.floor(gameState.currentPrices[drug.name] * multiplier);
    
    const addictMessages = [
        `🔥 ${drug.name} addicts are buying at outrageous prices!`,
        `💸 Desperate ${drug.name} users will pay anything!`,
        `🚀 ${drug.name} addicts are going crazy - prices through the roof!`,
        `⚡ ${drug.name} demand is INSANE - addicts paying top dollar!`
    ];
    
    const message = addictMessages[Math.floor(Math.random() * addictMessages.length)];
    addMessage(message, 'event');
    addMessage(`💰 This is your chance to make SERIOUS money!`, 'event');
    
    if (!headlinesSoundPlayed) {
        playSound('headlines'); // News headlines sound
    }
}

// Police dog event - K-9 unit chases you, causing drug drops
function handlePoliceDogEvent() {
    const hasInventory = Object.keys(gameState.player.inventory).length > 0;
    
    if (!hasInventory) {
        // No inventory, just a scary encounter
        addMessage('🐕 A police dog sniffs around but finds nothing!', 'event');
        addMessage('You nervously walk away as the K-9 unit moves on.', 'success');
        playSound('policedog');
        return;
    }
    
    playSound('policedog'); // Police dog sound
    
    const dogNames = ['Rex', 'Duke', 'Bruno', 'Max', 'Ace', 'Thor', 'Ranger'];
    const dogName = dogNames[Math.floor(Math.random() * dogNames.length)];
    
    addMessage(`🐕 Police dog ${dogName} catches your scent!`, 'event');
    addMessage('The K-9 unit is closing in! You need to move fast!', 'error');
    
    // Determine outcome based on what you're carrying
    const inventoryItems = Object.keys(gameState.player.inventory);
    const totalDrugs = inventoryItems.reduce((sum, drug) => sum + gameState.player.inventory[drug], 0);
    
    if (totalDrugs > 50) {
        addMessage('You\'re carrying too much! The weight is slowing you down!', 'error');
        handleDogChaseEscape(dogName, 0.7); // 70% chance to drop drugs
    } else if (totalDrugs > 20) {
        addMessage('The dog is getting closer! You need to run!', 'error');
        handleDogChaseEscape(dogName, 0.5); // 50% chance to drop drugs
    } else {
        addMessage('You\'re light on your feet! Time to get out of here!', 'event');
        handleDogChaseEscape(dogName, 0.3); // 30% chance to drop drugs
    }
}

// Handle the dog chase escape mechanics
function handleDogChaseEscape(dogName, dropChance) {
    const inventoryItems = Object.keys(gameState.player.inventory);
    
    if (Math.random() < dropChance) {
        // Player drops drugs while running
        const numToDrop = Math.min(inventoryItems.length, 1 + Math.floor(Math.random() * 3)); // Drop 1-3 types
        const droppedDrugs = [];
        
        for (let i = 0; i < numToDrop; i++) {
            const drugToDropIndex = Math.floor(Math.random() * inventoryItems.length);
            const drugToDrop = inventoryItems[drugToDropIndex];
            
            if (gameState.player.inventory[drugToDrop] > 0) {
                const amountToDrop = Math.min(
                    gameState.player.inventory[drugToDrop],
                    Math.floor(gameState.player.inventory[drugToDrop] * (0.3 + Math.random() * 0.4)) // Drop 30-70%
                );
                
                if (amountToDrop > 0) {
                    gameState.player.inventory[drugToDrop] -= amountToDrop;
                    droppedDrugs.push(`${amountToDrop} ${drugToDrop}`);
                    
                    // Remove drug from inventory if quantity reaches 0
                    if (gameState.player.inventory[drugToDrop] <= 0) {
                        delete gameState.player.inventory[drugToDrop];
                    }
                }
            }
        }
        
        if (droppedDrugs.length > 0) {
            addMessage(`💨 You dropped: ${droppedDrugs.join(', ')} while running!`, 'error');
            addMessage(`${dogName} found your stash! The evidence is gone.`, 'error');
            playSound('dump'); // Dropping sound
        }
        
        // Small chance the dog handler catches you anyway
        if (Math.random() < 0.2) {
            addMessage('The dog handler catches up! You\'re in trouble!', 'error');
            addMessage('You lost some cash in the confusion.', 'error');
            const cashLoss = Math.floor(gameState.player.cash * 0.1);
            gameState.player.cash = Math.max(0, gameState.player.cash - cashLoss);
            playSound('cophit');
        } else {
            addMessage('You managed to lose them in the crowd!', 'success');
            playSound('copchase'); // Police chase sound for escaping
            playSound('whew'); // Relief sound
        }
    } else {
        // Player escapes without dropping anything
        addMessage(`You outran ${dogName}! Close call!`, 'success');
        addMessage('You kept all your inventory intact.', 'success');
        playSound('copchase'); // Police chase sound for escaping
        playSound('whew'); // Relief sound
    }
}

// Loan shark event
function handleLoanSharkEvent() {
    const loanShark = getRandomCharacter('loanSharks');
    const events = ['demand', 'offer', 'threat'];
    const event = events[Math.floor(Math.random() * events.length)];
    
    playSound('stairs'); // Loan shark approaching sound
    addMessage(`💀 ${loanShark.emoji} ${loanShark.name} approaches you!`, 'event');
    
    switch (event) {
        case 'demand':
            const demand = Math.floor(gameState.player.debt * 0.1);
            addMessage(`${loanShark.name}: "${getCharacterDialogue(loanShark, 'demand')}"`, 'event');
            addMessage(`They demand $${demand} payment NOW!`, 'event');
            
            if (gameState.player.cash >= demand) {
                gameState.player.cash -= demand;
                gameState.player.debt -= demand;
                addMessage(`You paid $${demand} to avoid trouble.`, 'success');
                playSound('money'); // Loan shark money sound
            } else {
                addMessage('You could not pay. They are not happy...', 'error');
                if (loanShark.type === 'threatening') {
                    gameState.player.debt += Math.floor(demand * 0.8);
                    addMessage(`${loanShark.name}: "${getCharacterDialogue(loanShark, 'intimidate')}"`, 'event');
                    playSound('chainsaw'); // Threatening loan shark sound
                } else {
                    gameState.player.debt += Math.floor(demand * 0.5);
                    playSound('firstwarn'); // First warning sound
                }
            }
            break;
        case 'offer':
            const offer = Math.floor(500 + Math.random() * 1000);
            addMessage(`${loanShark.name} offers you an additional $${offer} loan at high interest.`, 'event');
            playSound('borrow'); // Loan offer sound
            if (loanShark.type === 'greedy') {
                addMessage('The interest rate looks astronomical!', 'error');
            } else {
                addMessage('This would increase your debt significantly.', 'error');
            }
            break;
        case 'threat':
            addMessage(`${loanShark.name}: "${getCharacterDialogue(loanShark, 'warning')}"`, 'event');
            addMessage('Better pay up soon or face consequences...', 'error');
            playSound('window'); // Threatening sound
            break;
    }
}

// Find cash event
function handleFindCashEvent() {
    const cashFound = Math.floor(50 + Math.random() * 200);
    gameState.player.cash += cashFound;
    addMessage(`💵 You found $${cashFound} on the ground!`, 'event');
    playSound('cashreg');
}

// Health issue event
function handleHealthIssueEvent() {
    const issues = ['Food Poisoning', 'Flu', 'Headache', 'Fatigue', 'Mysterious Rash', 'Dizzy Spells'];
    const issue = issues[Math.floor(Math.random() * issues.length)];
    const cost = Math.floor(100 + Math.random() * 200);
    
    addMessage(`🤒 You got ${issue}!`, 'event');
    
    const doctor = getRandomCharacter('doctors');
    addMessage(`${doctor.emoji} ${doctor.name} offers to help.`, 'event');
    addMessage(`${doctor.name}: "${getCharacterDialogue(doctor, 'offer')}"`, 'event');
    addMessage(`Medical costs: $${cost}`, 'event');
    
    if (gameState.player.cash >= cost) {
        gameState.player.cash -= cost;
        addMessage(`${doctor.name}: "${getCharacterDialogue(doctor, 'treatment')}"`, 'event');
        addMessage(`You paid $${cost} for treatment.`, 'success');
        playSound('doctor'); // Doctor treatment sound
        
        // Some doctors might give a bonus
        if (doctor.type === 'helpful' && Math.random() < 0.3) {
            const bonus = Math.floor(cost * 0.3);
            gameState.player.cash += bonus;
            addMessage(`${doctor.name} gives you a $${bonus} discount for being a good patient!`, 'success');
        }
    } else {
        addMessage(`${doctor.name}: "${getCharacterDialogue(doctor, 'advice')}"`, 'event');
        addMessage('You could not afford treatment. You feel terrible and lose a day.', 'error');
        gameState.player.day += 1;
        playSound('uhoh');
    }
}

// New character-based events
function handleDealerEncounter() {
    const dealer = getRandomCharacter('dealers');
    addMessage(`${dealer.emoji} ${dealer.name} approaches you.`, 'event');
    
    const eventType = Math.random();
    
    if (eventType < 0.4) {
        // Tip about market
        addMessage(`${dealer.name}: "${getCharacterDialogue(dealer, 'tip')}"`, 'event');
        const drug = getRandomDrug();
        if (drug) {
            const multiplier = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
            gameState.currentPrices[drug.name] = Math.floor(gameState.currentPrices[drug.name] * multiplier);
            addMessage(`${drug.name} prices shifted due to the tip!`, 'success');
        }
    } else if (eventType < 0.6) {
        // Warning about police
        addMessage(`${dealer.name}: "${getCharacterDialogue(dealer, 'warning')}"`, 'event');
        addMessage('You take extra care to avoid trouble today.', 'success');
    } else {
        // Offer to buy/sell
        const hasInventory = Object.keys(gameState.player.inventory).length > 0;
        if (hasInventory && Math.random() < 0.6) {
            const inventoryItems = Object.keys(gameState.player.inventory);
            const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)];
            const amount = Math.floor(Math.random() * Math.min(5, gameState.player.inventory[randomItem])) + 1;
            const price = Math.floor(gameState.currentPrices[randomItem] * 1.1);
            
            addMessage(`${dealer.name}: "${getCharacterDialogue(dealer, 'deal')}"`, 'event');
            addMessage(`They offer to buy ${amount} ${randomItem} for $${price} each.`, 'event');
            
            if (Math.random() < 0.5) {
                gameState.player.cash += price * amount;
                gameState.player.inventory[randomItem] -= amount;
                if (gameState.player.inventory[randomItem] <= 0) {
                    delete gameState.player.inventory[randomItem];
                }
                addMessage(`You sold ${amount} ${randomItem} for $${price * amount}!`, 'success');
                playSound('cashreg');
            } else {
                addMessage('You decided not to make the deal.', 'event');
            }
        } else {
            addMessage(`${dealer.name}: "${getCharacterDialogue(dealer, 'deal')}"`, 'event');
            addMessage('They don\'t have anything interesting to offer right now.', 'event');
        }
    }
}

function handleInformantTip() {
    const informant = getRandomCharacter('informants');
    addMessage(`${informant.emoji} ${informant.name} whispers to you.`, 'event');
    
    const tipType = Math.random();
    
    if (tipType < 0.3) {
        // Market tip
        addMessage(`${informant.name}: "${getCharacterDialogue(informant, 'tip')}"`, 'event');
        const drug = getRandomDrug();
        if (drug) {
            const multiplier = Math.random() < 0.5 ? 1.3 : 0.7;
            gameState.currentPrices[drug.name] = Math.floor(gameState.currentPrices[drug.name] * multiplier);
            addMessage(`${drug.name} prices ${multiplier > 1 ? 'surged' : 'dropped'} based on the tip!`, 'success');
        }
    } else if (tipType < 0.6) {
        // Police warning
        addMessage(`${informant.name}: "${getCharacterDialogue(informant, 'info')}"`, 'event');
        addMessage('You\'ll be more careful about police encounters today.', 'success');
    } else {
        // General gossip
        addMessage(`${informant.name}: "${getCharacterDialogue(informant, 'gossip')}"`, 'event');
        // Small cash bonus for listening
        const tip = Math.floor(10 + Math.random() * 30);
        gameState.player.cash += tip;
        addMessage(`You tipped the informant $${tip} for the information.`, 'success');
    }
}

// Utility functions
function loseRandomInventory(percentage) {
    const inventoryItems = Object.keys(gameState.player.inventory);
    if (inventoryItems.length === 0) return;
    
    const itemToLose = inventoryItems[Math.floor(Math.random() * inventoryItems.length)];
    const currentAmount = gameState.player.inventory[itemToLose];
    const amountToLose = Math.floor(currentAmount * percentage);
    
    if (amountToLose > 0) {
        gameState.player.inventory[itemToLose] -= amountToLose;
        if (gameState.player.inventory[itemToLose] <= 0) {
            delete gameState.player.inventory[itemToLose];
        }
        addMessage(`You lost ${amountToLose} ${itemToLose} in the incident.`, 'error');
    }
}

function getCurrentInventorySize() {
    return Object.values(gameState.player.inventory).reduce((sum, amount) => sum + amount, 0);
}

// Get current maximum inventory capacity
function getCurrentMaxInventory() {
    const baseCapacity = gameState.player.maxInventory;
    const coatCapacity = gameState.player.coat ? gameState.player.coat.capacity : baseCapacity;
    return coatCapacity;
}

// Convert full city names to abbreviations
function getCityAbbreviation(cityName) {
    const cityAbbreviations = {
        'New York': 'NYC',
        'Los Angeles': 'LA',
        'Chicago': 'CHI',
        'Miami': 'MIA',
        'Detroit': 'DET',
        'Boston': 'BOS'
    };
    return cityAbbreviations[cityName] || cityName;
}

// Format location display with city abbreviations
function formatLocationDisplay(fullLocation) {
    const [city, district] = fullLocation.split(' - ');
    const cityAbbrev = getCityAbbreviation(city);
    return `${cityAbbrev} - ${district}`;
}

function calculateNetWorth() {
    let inventoryValue = 0;
    
    Object.keys(gameState.player.inventory).forEach(drug => {
        const amount = gameState.player.inventory[drug];
        const price = gameState.currentPrices[drug];
        inventoryValue += amount * price;
    });
    
    const bankBalance = gameState.player.bankBalance || 0;
    return gameState.player.cash + bankBalance + inventoryValue - gameState.player.debt;
}

// Sound system
function playSound(soundName) {
    if (sounds[soundName]) {
        try {
            sounds[soundName].currentTime = 0;
            sounds[soundName].play().catch(e => {
                // Silently handle audio play errors (user interaction required)
            });
        } catch (e) {
            // Silently handle audio errors
        }
    }
}

// UI Functions
function addMessage(message, type = 'normal') {
    const gameOutput = document.getElementById('gameOutput');
    const messageDiv = document.createElement('div');
    
    messageDiv.innerHTML = message;
    
    if (type === 'error') {
        messageDiv.className = 'error-message';
    } else if (type === 'success') {
        messageDiv.className = 'success-message';
    } else if (type === 'event') {
        messageDiv.className = 'event-message';
    } else if (type === 'input') {
        messageDiv.style.color = '#FFA500';
    }
    
    gameOutput.appendChild(messageDiv);
    gameOutput.scrollTop = gameOutput.scrollHeight;
}

function updateDisplay() {
    // Update player stats with DOM validation
    const playerName = document.getElementById('playerName');
    const playerCash = document.getElementById('playerCash');
    const playerBank = document.getElementById('playerBank');
    const playerDebt = document.getElementById('playerDebt');
    const playerNetWorth = document.getElementById('playerNetWorth');
    const currentDay = document.getElementById('currentDay');
    const currentCity = document.getElementById('currentCity');
    const currentLocation = document.getElementById('currentLocation');
    const inventorySpace = document.getElementById('inventorySpace');
    
    if (playerName) playerName.textContent = gameState.player.name || 'Anonymous Dealer';
    if (playerCash) playerCash.textContent = `$${gameState.player.cash}`;
    if (playerBank) playerBank.textContent = `$${gameState.player.bankBalance || 0}`;
    if (playerDebt) playerDebt.textContent = `$${gameState.player.debt}`;
    if (playerNetWorth) playerNetWorth.textContent = `$${calculateNetWorth()}`;
    if (currentDay) currentDay.textContent = `${gameState.player.day}`;
    
    // Update city and location separately
    const [city, district] = gameState.player.location.split(' - ');
    if (currentCity) currentCity.textContent = city;
    if (currentLocation) currentLocation.textContent = district;
    
    if (inventorySpace) inventorySpace.textContent = `${getCurrentInventorySize()}/${getCurrentMaxInventory()}`;
    
    // Update market prices
    updateMarketDisplay();
    
    // Update inventory display
    updateInventoryDisplay();
    
    // Update location-specific service buttons
    updateLocationServiceButtons();
}

// Update location-specific service buttons based on current location
function updateLocationServiceButtons() {
    const currentLocation = gameState.player.location;
    const [city, district] = currentLocation.split(' - ');
    const locationData = gameState.locationServices[city] && gameState.locationServices[city][district];
    
    // Desktop buttons
    const weaponShopBtn = document.getElementById('weaponShopBtn');
    const clothesShopBtn = document.getElementById('clothesShopBtn');
    const bankBtn = document.getElementById('bankBtn');
    
    // Mobile buttons
    const mobileWeaponShopBtn = document.getElementById('mobileWeaponShopBtn');
    const mobileClothesShopBtn = document.getElementById('mobileClothesShopBtn');
    const mobileBankBtn = document.getElementById('mobileBankBtn');
    
    // Hide all buttons by default
    if (weaponShopBtn) weaponShopBtn.style.display = 'none';
    if (clothesShopBtn) clothesShopBtn.style.display = 'none';
    if (bankBtn) bankBtn.style.display = 'none';
    if (mobileWeaponShopBtn) mobileWeaponShopBtn.style.display = 'none';
    if (mobileClothesShopBtn) mobileClothesShopBtn.style.display = 'none';
    if (mobileBankBtn) mobileBankBtn.style.display = 'none';
    
    // Show buttons based on available services
    if (locationData && locationData.services) {
        if (locationData.services.includes('weapons')) {
            if (weaponShopBtn) weaponShopBtn.style.display = 'inline-block';
            if (mobileWeaponShopBtn) mobileWeaponShopBtn.style.display = 'inline-block';
        }
        
        if (locationData.services.includes('clothes')) {
            if (clothesShopBtn) clothesShopBtn.style.display = 'inline-block';
            if (mobileClothesShopBtn) mobileClothesShopBtn.style.display = 'inline-block';
        }
        
        if (locationData.services.includes('bank')) {
            if (bankBtn) bankBtn.style.display = 'inline-block';
            if (mobileBankBtn) mobileBankBtn.style.display = 'inline-block';
        }
    }
}

// LocalStorage availability check
function isLocalStorageAvailable() {
    try {
        const testKey = '__localStorage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

// Safe random drug selection with bounds checking
function getRandomDrug() {
    if (!gameState.drugs || gameState.drugs.length === 0) {
        console.warn('No drugs available for random selection');
        return null;
    }
    return gameState.drugs[Math.floor(Math.random() * gameState.drugs.length)];
}

// Game state validation
function validateGameState(state) {
    if (!state || typeof state !== 'object') return false;
    
    // Check required properties
    if (!state.player || !state.cities || !state.drugs) return false;
    
    // Validate player object
    if (typeof state.player.cash !== 'number' || 
        typeof state.player.debt !== 'number' || 
        typeof state.player.day !== 'number' ||
        !state.player.location || 
        typeof state.player.location !== 'string') {
        return false;
    }
    
    // Validate location format
    const locationParts = state.player.location.split(' - ');
    if (locationParts.length !== 2 || !locationParts[0] || !locationParts[1]) {
        return false;
    }
    
    return true;
}

// Game end
function endGame() {
    gameState.gameRunning = false;
    gameState.gameOver = true;
    
    const finalNetWorth = calculateNetWorth();
    
    addMessage('', 'normal');
    addMessage('='.repeat(50), 'event');
    addMessage('GAME OVER!', 'event');
    addMessage(`Final Day: ${gameState.player.day}`, 'event');
    addMessage(`Final Cash: $${gameState.player.cash}`, 'event');
    addMessage(`Remaining Debt: $${gameState.player.debt}`, 'event');
    addMessage(`Final Net Worth: $${finalNetWorth}`, 'event');
    
    if (finalNetWorth > 0) {
        addMessage('Congratulations! You made a profit!', 'success');
        playSound('star'); // Victory sound
    } else {
        addMessage('You ended in debt. Better luck next time!', 'error');
        playSound('dead'); // Game over sound
    }
    
    addMessage('='.repeat(50), 'event');
    
    // Check for high score
    setTimeout(() => {
        checkHighScore(finalNetWorth);
    }, 2000);
}

// Menu system
function toggleMenu() {
    const menu = document.getElementById('gameMenu');
    menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
}

function closeMenu() {
    document.getElementById('gameMenu').style.display = 'none';
    // Command input removed - using clickable interface only
}

// Game management
function newGame() {
    // Ask for player name
    const playerName = prompt('Enter your dealer name:', 'Anonymous Dealer');
    const finalName = playerName && playerName.trim() ? playerName.trim() : 'Anonymous Dealer';
    
    // Reset only the player state, keeping the game data intact
    gameState.player = {
        name: finalName,
        cash: GAME_CONSTANTS.PLAYER.STARTING_CASH,
        debt: GAME_CONSTANTS.PLAYER.STARTING_DEBT,
        bankBalance: 0,
        inventory: {},
        location: 'New York - Brooklyn Docks',
        day: 1,
        maxDays: GAME_CONSTANTS.PLAYER.MAX_DAYS,
        maxInventory: GAME_CONSTANTS.PLAYER.BASE_INVENTORY,
        weapon: null, // Deprecated - use weapons array
        weapons: [], // Player can own up to 2 weapons
        coat: null,
        purchaseHistory: {} // Track purchase history for profit/loss calculations
    };
    
    // Reset game state flags
    gameState.currentPrices = {};
    gameState.previousPrices = {};
    gameState.priceHistory = {}; // Track day-wise price history for graphs
    gameState.gameRunning = false;
    gameState.gameOver = false;
    
    document.getElementById('gameOutput').innerHTML = '';
    closeMenu();
    initGame();
    
    addMessage('New game started!', 'success');
}

// Save/Load system
function saveGame() {
    // Check if localStorage is available
    if (!isLocalStorageAvailable()) {
        addMessage('Cannot save game: Storage not available (private browsing mode?)', 'error');
        playSound('uhoh');
        return;
    }
    
    try {
        localStorage.setItem('packetPushersGame', JSON.stringify(gameState));
        addMessage('Game saved successfully!', 'success');
        playSound('cashreg');
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            addMessage('Error saving game: Storage quota exceeded. Clear browser data and try again.', 'error');
        } else {
            addMessage('Error saving game: ' + e.message, 'error');
        }
        playSound('uhoh');
    }
}

function loadGame() {
    // Check if localStorage is available
    if (!isLocalStorageAvailable()) {
        addMessage('Cannot load game: Storage not available (private browsing mode?)', 'error');
        playSound('uhoh');
        return;
    }
    
    try {
        const savedGame = localStorage.getItem('packetPushersGame');
        if (savedGame) {
            const parsedState = JSON.parse(savedGame);
            
            // Validate the loaded state
            if (!validateGameState(parsedState)) {
                addMessage('Error loading game: Save file is corrupted or incompatible.', 'error');
                playSound('uhoh');
                return;
            }
            
            gameState = parsedState;
            updateDisplay();
            addMessage('Game loaded successfully!', 'success');
            playSound('cashreg');
            closeMenu();
        } else {
            addMessage('No saved game found.', 'error');
            playSound('uhoh');
        }
    } catch (e) {
        if (e instanceof SyntaxError) {
            addMessage('Error loading game: Save file is corrupted (invalid JSON).', 'error');
        } else {
            addMessage('Error loading game: ' + e.message, 'error');
        }
        playSound('uhoh');
    }
}

// Leaderboard system (enhanced version below)

function getLeaderboard() {
    try {
        const saved = localStorage.getItem('packetPushersLeaderboard');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

function saveHighScore(name, score) {
    const leaderboard = getLeaderboard();
    leaderboard.push({ name: name, score: score });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.splice(10); // Keep only top 10
    
    try {
        localStorage.setItem('packetPushersLeaderboard', JSON.stringify(leaderboard));
    } catch (e) {
        console.error('Error saving leaderboard:', e);
    }
}

function showLeaderboard() {
    const leaderboard = getLeaderboard();
    const leaderboardDiv = document.getElementById('leaderboard');
    const leaderboardList = document.getElementById('leaderboardList');
    
    leaderboardList.innerHTML = '';
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = '<div class="empty-inventory">No scores yet</div>';
    } else {
        leaderboard.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'leaderboard-entry';
            entryDiv.innerHTML = `
                <span class="leaderboard-rank">${index + 1}.</span>
                <span class="leaderboard-name">${entry.name}</span>
                <span class="leaderboard-score">$${entry.score}</span>
            `;
            leaderboardList.appendChild(entryDiv);
        });
    }
    
    leaderboardDiv.style.display = 'flex';
}

function closeLeaderboard() {
    document.getElementById('leaderboard').style.display = 'none';
}

// Start Screen Functions
function initStartScreen() {
    const startScreen = document.getElementById('startScreen');
    const gameLayout = document.getElementById('gameLayout');
    const gameHeader = document.querySelector('.game-header');
    
    // Show start screen, hide game
    startScreen.style.display = 'flex';
    gameLayout.style.display = 'none';
    gameHeader.style.display = 'none';
    
    // Check for saved game
    const savedGame = localStorage.getItem('packetPushersGame');
    const continueBtn = document.getElementById('continueBtn');
    
    if (savedGame) {
        try {
            const parsedGame = JSON.parse(savedGame);
            if (parsedGame.gameRunning && !parsedGame.gameOver) {
                continueBtn.style.display = 'block';
            }
        } catch (e) {
            // Invalid save, hide continue button
            continueBtn.style.display = 'none';
        }
    } else {
        continueBtn.style.display = 'none';
    }
    
    // Load and display leaderboard
    updateStartLeaderboard();
}

function updateStartLeaderboard() {
    const leaderboard = getLeaderboard();
    const leaderboardList = document.getElementById('startLeaderboardList');
    
    leaderboardList.innerHTML = '';
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = '<div class="no-scores">No scores yet - be the first!</div>';
        return;
    }
    
    // Show top 5 on start screen
    leaderboard.slice(0, 5).forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'start-leaderboard-entry';
        
        // Add special styling for top 3
        if (index < 3) {
            entryDiv.style.background = `linear-gradient(90deg, 
                ${index === 0 ? 'rgba(255, 215, 0, 0.2)' : 
                  index === 1 ? 'rgba(192, 192, 192, 0.2)' : 
                  'rgba(205, 127, 50, 0.2)'}, 
                rgba(0, 255, 0, 0.1))`;
        }
        
        entryDiv.innerHTML = `
            <span class="start-leaderboard-rank">${index + 1}.</span>
            <span class="start-leaderboard-name">${entry.name}</span>
            <span class="start-leaderboard-score">$${entry.score.toLocaleString()}</span>
        `;
        leaderboardList.appendChild(entryDiv);
    });
}

function startNewGame() {
    // Ask for player name
    const playerName = prompt('Enter your dealer name:', 'Anonymous Dealer');
    const finalName = playerName && playerName.trim() ? playerName.trim() : 'Anonymous Dealer';
    
    // Reset only the player state, keeping the game data intact
    gameState.player = {
        name: finalName,
        cash: GAME_CONSTANTS.PLAYER.STARTING_CASH,
        debt: GAME_CONSTANTS.PLAYER.STARTING_DEBT,
        bankBalance: 0,
        inventory: {},
        location: 'New York - Brooklyn Docks',
        day: 1,
        maxDays: GAME_CONSTANTS.PLAYER.MAX_DAYS,
        maxInventory: GAME_CONSTANTS.PLAYER.BASE_INVENTORY,
        weapon: null, // Deprecated - use weapons array
        weapons: [], // Player can own up to 2 weapons
        coat: null,
        purchaseHistory: {} // Track purchase history for profit/loss calculations
    };
    
    console.log('New game started with player cash:', gameState.player.cash);
    
    // Reset game state flags
    gameState.currentPrices = {};
    gameState.previousPrices = {};
    gameState.priceHistory = {}; // Track day-wise price history for graphs
    gameState.gameRunning = true;
    gameState.gameOver = false;
    
    // Clear any existing game output
    document.getElementById('gameOutput').innerHTML = '';
    
    // Show game interface
    showGameInterface();
    
    // Initialize game
    initGame();
    
    addMessage('New game started! Good luck, dealer.', 'success');
    playSound('slidein'); // Game start sound
}

function continueGame() {
    try {
        const savedGame = localStorage.getItem('packetPushersGame');
        if (savedGame) {
            const savedState = JSON.parse(savedGame);
            
            // Migrate old save data to new structure
            if (!savedState.shops || !savedState.weapons || !savedState.coats) {
                // Only update the player data from saved game, keep the new game structure
                gameState.player = savedState.player;
                gameState.currentPrices = savedState.currentPrices || {};
                gameState.previousPrices = savedState.previousPrices || {};
                gameState.gameRunning = savedState.gameRunning;
                gameState.gameOver = savedState.gameOver;
                
                // Ensure player has new fields
                if (!gameState.player.weapon) gameState.player.weapon = null;
                if (!gameState.player.coat) gameState.player.coat = null;
                if (!gameState.player.purchaseHistory) gameState.player.purchaseHistory = {};
                if (!gameState.priceHistory) gameState.priceHistory = {};
                
                addMessage('Save file migrated to new version with shops and weapons!', 'success');
            } else {
                // New save format, load everything
                gameState = savedState;
            }
            
            showGameInterface();
            updateDisplay();
            addMessage('Game loaded successfully! Welcome back, dealer.', 'success');
            playSound('cashreg');
            
            // Set up event listeners
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('keyup', handleKeyUp);
            // Command input removed - using clickable interface only
        } else {
            addMessage('No saved game found.', 'error');
            playSound('uhoh');
        }
    } catch (e) {
        addMessage('Error loading game. Save file might be corrupted.', 'error');
        playSound('uhoh');
    }
}

function showStartLeaderboard() {
    const leaderboard = getLeaderboard();
    
    if (leaderboard.length === 0) {
        alert('No high scores yet! Play a game to set the first record.');
        return;
    }
    
    let leaderboardText = '🏆 HIGH SCORES 🏆\n\n';
    leaderboard.forEach((entry, index) => {
        const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
        leaderboardText += `${medal} ${entry.name} - $${entry.score.toLocaleString()}
`;
    });
    
    alert(leaderboardText);
}

function showGameInterface() {
    const startScreen = document.getElementById('startScreen');
    const gameLayout = document.getElementById('gameLayout');
    const gameHeader = document.querySelector('.game-header');
    
    // Hide start screen, show game
    startScreen.style.display = 'none';
    gameLayout.style.display = 'grid';
    gameHeader.style.display = 'block';
}

// This function is now handled by the first newGame function above

// Enhanced checkHighScore function
function checkHighScore(score) {
    const leaderboard = getLeaderboard();
    
    if (leaderboard.length < 10 || score > leaderboard[leaderboard.length - 1].score) {
        const name = prompt('🎉 HIGH SCORE! 🎉\n\nEnter your name for the leaderboard:');
        if (name && name.trim()) {
            saveHighScore(name.trim(), score);
            addMessage(`High score saved! Final score: $${score.toLocaleString()}`, 'success');
            
            // Show updated leaderboard
            setTimeout(() => {
                const newLeaderboard = getLeaderboard();
                const playerRank = newLeaderboard.findIndex(entry => entry.name === name.trim() && entry.score === score) + 1;
                
                let congratsMessage = `🏆 CONGRATULATIONS! 🏆

You placed #${playerRank} on the leaderboard!

`;
                congratsMessage += 'TOP 5 DEALERS:\n';
                newLeaderboard.slice(0, 5).forEach((entry, index) => {
                    const medal = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
                    congratsMessage += `${medal} ${entry.name} - $${entry.score.toLocaleString()}\n`;
                });
                
                alert(congratsMessage);
            }, 500);
        }
    }
}

// Initialize game on page load
document.addEventListener('DOMContentLoaded', function() {
    // Show start screen first
    initStartScreen();
});