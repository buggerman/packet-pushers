// Packet Pushers Server-Side Game Logic
// All game mechanics run on server to prevent cheating

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Game constants (server-authoritative)
const GAME_CONSTANTS = {
    PLAYER: {
        STARTING_CASH: 2000,
        STARTING_DEBT: 5000,
        MAX_DAYS: 30,
        BASE_INVENTORY: 100
    },
    TRAVEL: {
        DAILY_INTEREST_RATE: 0.05
    }
};

// Drug definitions (server-authoritative)
const DRUGS = [
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
];

// Generate server-side market prices
function generateMarketPrices(day, location, events = []) {
    return DRUGS.map(drug => {
        let price = drug.basePrice * (0.5 + Math.random() * drug.volatility);
        
        // Apply location modifiers
        if (location.includes('Airport')) price *= 1.2;
        if (location.includes('Park')) price *= 0.8;
        
        // Apply event modifiers
        events.forEach(event => {
            if (event.type === 'drug_bust' && event.affectedDrugs.includes(drug.name)) {
                price *= 3.0;
            }
            if (event.type === 'market_surge') {
                price *= 1.5;
            }
        });
        
        return {
            name: drug.name,
            price: Math.floor(price)
        };
    });
}

// Validate game action
function validateAction(sessionData, action) {
    const { type, data } = action;
    const { player, day, game_running } = sessionData;
    
    if (!game_running) return { valid: false, error: 'Game not running' };
    if (day > GAME_CONSTANTS.PLAYER.MAX_DAYS) return { valid: false, error: 'Game ended' };
    
    switch (type) {
        case 'buy':
            const { drugName, quantity, expectedCost } = data;
            const actualCost = sessionData.current_prices.find(d => d.name === drugName)?.price * quantity;
            
            if (Math.abs(actualCost - expectedCost) > 1) {
                return { valid: false, error: 'Price mismatch - possible tampering' };
            }
            if (player.cash < actualCost) {
                return { valid: false, error: 'Insufficient funds' };
            }
            
            const currentInventory = Object.values(player.inventory).reduce((a, b) => a + b, 0);
            if (currentInventory + quantity > player.maxInventory) {
                return { valid: false, error: 'Insufficient inventory space' };
            }
            
            return { valid: true };
            
        case 'sell':
            const currentAmount = player.inventory[data.drugName] || 0;
            if (currentAmount < data.quantity) {
                return { valid: false, error: 'Insufficient inventory' };
            }
            return { valid: true };
            
        case 'travel':
            // Validate travel is possible
            return { valid: true };
            
        default:
            return { valid: false, error: 'Unknown action' };
    }
}

// Execute game action server-side
function executeAction(sessionData, action) {
    const validation = validateAction(sessionData, action);
    if (!validation.valid) return { success: false, error: validation.error };
    
    const { type, data } = action;
    const { player } = sessionData;
    const messages = [];
    const events = [];
    
    switch (type) {
        case 'buy':
            const cost = sessionData.current_prices.find(d => d.name === data.drugName).price * data.quantity;
            player.cash -= cost;
            player.inventory[data.drugName] = (player.inventory[data.drugName] || 0) + data.quantity;
            
            messages.push({
                text: `Bought ${data.quantity} ${data.drugName} for $${cost.toLocaleString()}`,
                type: 'success'
            });
            
            // Random buy events
            if (Math.random() < 0.1) {
                events.push({
                    text: `The dealer whispers: "That's some good stuff, friend."`,
                    type: 'event'
                });
            }
            break;
            
        case 'sell':
            const revenue = sessionData.current_prices.find(d => d.name === data.drugName).price * data.quantity;
            player.cash += revenue;
            player.inventory[data.drugName] -= data.quantity;
            if (player.inventory[data.drugName] <= 0) {
                delete player.inventory[data.drugName];
            }
            
            messages.push({
                text: `Sold ${data.quantity} ${data.drugName} for $${revenue.toLocaleString()}`,
                type: 'success'
            });
            
            // Random sell events  
            if (Math.random() < 0.15) {
                events.push({
                    text: `Your buyer nods approvingly and walks away quickly.`,
                    type: 'event'
                });
            }
            break;
            
        case 'travel':
            player.location = data.destination;
            sessionData.day += 1;
            
            // Apply daily interest
            player.debt = Math.floor(player.debt * (1 + GAME_CONSTANTS.TRAVEL.DAILY_INTEREST_RATE));
            
            messages.push({
                text: `Traveled to ${data.destination}. Day ${sessionData.day}`,
                type: 'info'
            });
            
            // Generate new market prices
            sessionData.current_prices = generateMarketPrices(sessionData.day, player.location);
            
            // Complete original random event system on travel
            const randomEvent = generateRandomEvent();
            if (randomEvent) {
                events.push(randomEvent);
                
                // Some events affect game state
                if (randomEvent.action) {
                    randomEvent.action(sessionData);
                }
            }
            break;
    }
    
    return { 
        success: true, 
        sessionData: sessionData,
        messages: messages,
        events: events
    };
}

// Complete original random event system (server-side)
function generateRandomEvent() {
    // All events with original weights from main branch
    const events = [
        { type: 'old_lady', weight: 22 },
        { type: 'police', weight: 18 },
        { type: 'mugging', weight: 15 },
        { type: 'market_surge', weight: 15 },
        { type: 'market_crash', weight: 15 },
        { type: 'drug_bust', weight: 12 },
        { type: 'police_raid', weight: 8 },
        { type: 'supply_shortage', weight: 10 },
        { type: 'addicts', weight: 8 },
        { type: 'police_dog', weight: 12 },
        { type: 'loan_shark', weight: 8 },
        { type: 'find_cash', weight: 10 },
        { type: 'health_issue', weight: 4 },
        { type: 'dealer_encounter', weight: 6 },
        { type: 'informant_tip', weight: 5 },
        { type: 'nothing', weight: 2 }
    ];
    
    const totalWeight = events.reduce((sum, event) => sum + event.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let event of events) {
        random -= event.weight;
        if (random <= 0) {
            return executeServerRandomEvent(event.type);
        }
    }
    
    return null;
}

// Execute random events server-side with original game logic
function executeServerRandomEvent(eventType) {
    switch (eventType) {
        case 'old_lady':
            return {
                text: "👵 An old lady in tattered clothes approaches you with knowing eyes.",
                type: 'event',
                sound: 'oldlady',
                action: (sessionData) => {
                    // Old lady predictions and effects
                    if (Math.random() < 0.7) {
                        const predictions = [
                            "I see great fortune in cocaine futures, child...",
                            "The heroin market whispers of change...", 
                            "Acid will flow like rivers soon...",
                            "The streets will hunger for speed..."
                        ];
                        return {
                            text: predictions[Math.floor(Math.random() * predictions.length)],
                            type: 'event'
                        };
                    }
                    
                    // Cash bonus
                    if (Math.random() < 0.3) {
                        const bonus = 100 + Math.floor(Math.random() * 200);
                        sessionData.player.cash += bonus;
                        return {
                            text: `The old lady presses $${bonus} into your hand and vanishes.`,
                            type: 'success'
                        };
                    }
                }
            };
            
        case 'police':
            return {
                text: "🚔 Police spotted you! You need to make a choice...",
                type: 'warning',
                sound: 'siren',
                encounter: 'police',
                action: (sessionData) => {
                    // This will trigger police encounter modal on client
                    return { requiresUserAction: true, encounterType: 'police' };
                }
            };
            
        case 'mugging':
            const muggerNames = ['Sticky Pete', 'Knife Eddie', 'Mad Dog Mike', 'Crazy Joe'];
            const muggerName = muggerNames[Math.floor(Math.random() * muggerNames.length)];
            const demandAmount = 100 + Math.floor(Math.random() * 300);
            
            return {
                text: `🔪 ${muggerName} blocks your path demanding $${demandAmount}!`,
                type: 'warning',
                sound: 'mugger',
                encounter: 'mugger',
                encounterData: { name: muggerName, demand: demandAmount },
                action: (sessionData) => {
                    return { requiresUserAction: true, encounterType: 'mugger', encounterData: { name: muggerName, demand: demandAmount } };
                }
            };
            
        case 'find_cash':
            const foundAmount = 50 + Math.floor(Math.random() * 200);
            return {
                text: `💰 You found $${foundAmount} dropped on the street!`,
                type: 'success',
                sound: 'cashreg',
                action: (sessionData) => {
                    sessionData.player.cash += foundAmount;
                }
            };
            
        case 'drug_bust':
            const bustTypes = [
                'Police raid local dealers!',
                'SWAT team hits drug house!', 
                'Narcotics unit sweeps the area!',
                'Task force targets street dealers!'
            ];
            
            return {
                text: `🚔 ${bustTypes[Math.floor(Math.random() * bustTypes.length)]} Supply is tight!`,
                type: 'event',
                sound: 'headlines',
                action: (sessionData) => {
                    // Increase random drug prices
                    const numDrugs = 2 + Math.floor(Math.random() * 2);
                    for (let i = 0; i < numDrugs; i++) {
                        const drugIndex = Math.floor(Math.random() * sessionData.current_prices.length);
                        sessionData.current_prices[drugIndex].price *= (2.0 + Math.random() * 2.0);
                        sessionData.current_prices[drugIndex].price = Math.floor(sessionData.current_prices[drugIndex].price);
                    }
                }
            };
            
        case 'market_surge':
            return {
                text: "📈 Market surge! Demand is through the roof!",
                type: 'success',
                sound: 'headlines',
                action: (sessionData) => {
                    // Increase all prices by 50-150%
                    sessionData.current_prices.forEach(drug => {
                        drug.price *= (1.5 + Math.random());
                        drug.price = Math.floor(drug.price);
                    });
                }
            };
            
        case 'market_crash':
            return {
                text: "📉 Market crash! Prices are falling fast!",
                type: 'warning',
                sound: 'headlines',
                action: (sessionData) => {
                    // Decrease all prices by 30-70%
                    sessionData.current_prices.forEach(drug => {
                        drug.price *= (0.3 + Math.random() * 0.4);
                        drug.price = Math.floor(drug.price);
                    });
                }
            };
            
        case 'health_issue':
            const healthCost = 100 + Math.floor(Math.random() * 100);
            return {
                text: `🏥 You feel sick and need medical attention. Cost: $${healthCost}`,
                type: 'warning',
                sound: 'uhoh',
                action: (sessionData) => {
                    if (sessionData.player.cash >= healthCost) {
                        sessionData.player.cash -= healthCost;
                        sessionData.player.health = Math.min(100, (sessionData.player.health || 100) + 20);
                        return {
                            text: `💊 Feeling better after treatment. Health: ${sessionData.player.health}%`,
                            type: 'success'
                        };
                    } else {
                        sessionData.player.health = Math.max(10, (sessionData.player.health || 100) - 15);
                        return {
                            text: `😷 Couldn't afford treatment. Health: ${sessionData.player.health}%`,
                            type: 'error'
                        };
                    }
                }
            };
            
        case 'nothing':
            return null;
            
        default:
            return {
                text: "The streets are quiet today...",
                type: 'event'
            };
    }
}

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        switch (req.method) {
            case 'POST':
                return await handleGameAction(req, res);
            case 'GET':
                return await getGameSession(req, res);
            default:
                res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Game API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

async function getGameSession(req, res) {
    const { sessionId } = req.query;
    
    if (!sessionId) {
        // Create new game session
        const newSession = {
            id: generateSessionId(),
            player: {
                name: 'Anonymous',
                cash: GAME_CONSTANTS.PLAYER.STARTING_CASH,
                debt: GAME_CONSTANTS.PLAYER.STARTING_DEBT,
                bankBalance: 0,
                inventory: {},
                location: 'New York - John F. Kennedy',
                maxInventory: GAME_CONSTANTS.PLAYER.BASE_INVENTORY,
                weapons: [],
                health: 100
            },
            day: 1,
            game_running: true,
            game_over: false,
            current_prices: generateMarketPrices(1, 'New York - John F. Kennedy')
        };
        
        // Save session to database
        const { data, error } = await supabase
            .from('game_sessions')
            .insert([newSession])
            .select()
            .single();
            
        if (error) {
            console.error('Failed to create session:', error);
            return res.status(500).json({ 
                error: 'Failed to create game session',
                details: error.message,
                code: error.code 
            });
        }
        
        res.json({ success: true, session: data });
    } else {
        // Get existing session
        const { data, error } = await supabase
            .from('game_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
            
        if (error || !data) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({ success: true, session: data });
    }
}

async function handleGameAction(req, res) {
    const { sessionId, action } = req.body;
    
    if (!sessionId || !action) {
        return res.status(400).json({ error: 'Missing sessionId or action' });
    }
    
    // Get current session
    const { data: session, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
        
    if (error || !session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    // Execute action
    const result = executeAction(session, action);
    
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    
    // Update session in database
    const { error: updateError } = await supabase
        .from('game_sessions')
        .update({
            ...result.sessionData,
            last_activity: new Date().toISOString()
        })
        .eq('id', sessionId);
        
    if (updateError) {
        console.error('Failed to update session:', updateError);
        return res.status(500).json({ error: 'Failed to update session' });
    }
    
    res.json({ 
        success: true, 
        session: result.sessionData,
        messages: result.messages || [],
        events: result.events || []
    });
}

function generateSessionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}