const fs = require('fs');
const svg = fs.readFileSync('public/mapa-expo-ferre.svg', 'utf8');

// The SVG has text elements with stand numbers.
// And it has paths around them.
// Let's try to extract paths with fill colors and their closest text.
// Actually, let's just log occurrences of colors:
// Naranja (Diamante): let's find the orange color hex code in SVG.
// Verde (Oro): let's find the green color hex code.
// Azul (Plata): let's find the blue color hex code.
// Instead of full parsing, let's just grep for text elements.
