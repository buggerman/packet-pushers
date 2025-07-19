# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Packet Pushers** is a complete web-based implementation of the classic "Dope Wars" game, updated for 2025. It's a single-page application built with vanilla HTML, CSS, and JavaScript, designed to be deployed directly to GitHub Pages.

## Game Architecture

The game follows a client-side MVC pattern:

- **index.html**: Game structure with panels for output, stats, market, and inventory
- **style.css**: Retro terminal aesthetic with responsive design
- **script.js**: Complete game logic including state management, random events, and localStorage

### Core Game State
The `gameState` object contains:
- Player data (cash, debt, inventory, location, day)
- Cities and drug definitions with pricing mechanics
- Current market prices and game status

### Key Systems

1. **Interface System**: Fully clickable UI with desktop/mobile controls (command interface removed)
2. **Random Events**: Police encounters, muggings, market fluctuations, loan shark events
3. **Market System**: Dynamic pricing based on location multipliers and volatility
4. **Sound Integration**: Event-driven audio using files in `sound/` directory
5. **Save System**: localStorage for game saves and local leaderboard

## Common Development Tasks

### Testing the Game
- Open `index.html` in a web browser
- No build process required - pure client-side application
- Use clickable interface: BUY/SELL buttons, TRAVEL options, etc.

### Sound System
All sound effects are in the `sound/` directory:
- `cashreg.wav`: Buy/sell transactions
- `siren.wav`: Police encounters  
- `gun.wav`, `gun2.wav`: Combat/mugging events
- `wasted.wav`: Game over scenarios
- `uhoh.wav`: Negative events

### Responsive Design
The CSS uses CSS Grid and Flexbox with media queries for mobile adaptation:
- Desktop: 5-panel layout (main-log, player-status, market-prices, inventory, action-buttons)
- Mobile: Stacked panels with modal system for interactions

### Game Balance
- Starting cash: $2,000, debt: $5,000
- 30-day time limit with daily 5% interest
- 13 drugs with different volatility and base prices
- 6 cities with location-based price multipliers

## Local Storage Structure

### Game Saves
- Key: `packetPushersGame`
- Value: Complete gameState object as JSON

### Leaderboard
- Key: `packetPushersLeaderboard`
- Value: Array of {name, score} objects (top 10)

## File Dependencies

- No external libraries or frameworks
- All assets are local (sounds, styles, scripts)
- Ready for GitHub Pages deployment

## Development Notes

- Game uses vanilla JavaScript for maximum compatibility
- Fully clickable interface with retro terminal aesthetic
- All game logic is client-side with no server requirements
- Sound effects enhance gameplay but have fallback error handling
- Responsive design works on both desktop and mobile devices

## Recent Development Session (2025-01-18)

### Files Created/Modified:
1. **code_consolidation.md** - Instructions for removing command interface and implementing clickable UI
2. **item_desc.md** - Enhanced weapon and coat lore with dramatic backstories
3. **design_updates.md** - Comprehensive UI/UX analysis with accessibility and mobile issues
4. **specific_fixes.md** - Exact implementation instructions for UI improvements

### Key Findings:
- Command interface already replaced with fully clickable UI
- Game has excellent functionality but significant accessibility barriers
- Mobile experience needs improvement (touch targets, readability)
- 5-panel layout system is solid and compatible with suggested improvements

### Critical Issues Identified:
- Missing ARIA labels on interactive elements
- Touch targets below 44px accessibility minimum
- Poor focus management for keyboard navigation
- Text readability issues in market/inventory panels
- Modal system lacks escape key handling

### Implementation Priority:
1. **Critical**: Accessibility fixes (ARIA labels, focus indicators, keyboard navigation)
2. **High**: Touch target sizes, text readability improvements
3. **Medium**: Responsive grid enhancements, loading states
4. **Low**: Performance optimization, code cleanup

### Enhanced Item Lore Added:
- **Weapons**: Pea Shooter ("The Humbler"), Rubber Chicken ("The Absurdist's Nightmare"), etc.
- **Coats**: Trench Coat ("The Detective's Burden"), Smuggler's Coat ("The Professional's Pride"), etc.
- All items now have dramatic backstories with memorable characters

### Technical Notes:
- Current grid: `grid-template-columns: 1fr 250px 250px`
- Suggested: `grid-template-columns: 1fr 280px 280px` (safe increase)
- Button sizes: Current 24px → Suggested 44px minimum (requires spacing adjustments)
- Font sizes: Current 0.85rem → Suggested 0.9rem for readability

### Files Ready for Implementation:
- **specific_fixes.md**: Contains exact line numbers, code blocks, and implementation order
- All changes are surgical and preserve existing functionality
- Testing checklist provided for each modification

## Memory Tracking
- Added comprehensive UI/UX analysis and specific implementation fixes
- Enhanced item lore system with dramatic backstories
- Documented accessibility requirements and mobile optimization needs