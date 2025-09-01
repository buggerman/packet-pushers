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
    const { player, day, gameRunning } = sessionData;
    
    if (!gameRunning) return { valid: false, error: 'Game not running' };
    if (day > GAME_CONSTANTS.PLAYER.MAX_DAYS) return { valid: false, error: 'Game ended' };
    
    switch (type) {
        case 'buy':
            const { drugName, quantity, expectedCost } = data;
            const actualCost = sessionData.currentPrices.find(d => d.name === drugName)?.price * quantity;
            
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
    
    switch (type) {
        case 'buy':
            const cost = sessionData.currentPrices.find(d => d.name === data.drugName).price * data.quantity;
            player.cash -= cost;
            player.inventory[data.drugName] = (player.inventory[data.drugName] || 0) + data.quantity;
            break;
            
        case 'sell':
            const revenue = sessionData.currentPrices.find(d => d.name === data.drugName).price * data.quantity;
            player.cash += revenue;
            player.inventory[data.drugName] -= data.quantity;
            if (player.inventory[data.drugName] <= 0) {
                delete player.inventory[data.drugName];
            }
            break;
            
        case 'travel':
            player.location = data.destination;
            sessionData.day += 1;
            
            // Apply daily interest
            player.debt = Math.floor(player.debt * (1 + GAME_CONSTANTS.TRAVEL.DAILY_INTEREST_RATE));
            
            // Generate new market prices
            sessionData.currentPrices = generateMarketPrices(sessionData.day, player.location);
            break;
    }
    
    return { success: true, sessionData };
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
            gameRunning: true,
            gameOver: false,
            currentPrices: generateMarketPrices(1, 'New York - John F. Kennedy'),
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };
        
        // Save session to database
        const { data, error } = await supabase
            .from('game_sessions')
            .insert([newSession])
            .select()
            .single();
            
        if (error) {
            console.error('Failed to create session:', error);
            return res.status(500).json({ error: 'Failed to create game session' });
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
            lastActivity: new Date().toISOString()
        })
        .eq('id', sessionId);
        
    if (updateError) {
        console.error('Failed to update session:', updateError);
        return res.status(500).json({ error: 'Failed to update session' });
    }
    
    res.json({ 
        success: true, 
        session: result.sessionData,
        message: `${action.type} completed successfully`
    });
}

function generateSessionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}