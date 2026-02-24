/* data.js — Classic (non-module) build
   Works with double-click index.html (file://)
   Defines board graph, city colors, roles, events, crises, and exposes them on window.
*/

const COLORS = ["blue", "red", "yellow"];

/* City colors (Hot Zone: North America) */
const CITY_COLOR = {
    // Blue (Northeast / Great Lakes)
    "Chicago": "blue",
    "Indianapolis": "blue",
    "Atlanta": "blue",
    "Washington": "blue",
    "New York": "blue",
    "Boston": "blue",
    "Montréal": "blue",
    "Toronto": "blue",

    // Red (West / Central)
    "Seattle": "red",
    "San Francisco": "red",
    "Los Angeles": "red",
    "Phoenix": "red",
    "Denver": "red",
    "Dallas": "red",
    "Calgary": "red",
    "Minneapolis": "red",

    // Yellow (Mexico / Caribbean)
    "Miami": "yellow",
    "New Orleans": "yellow",
    "Monterrey": "yellow",
    "Guadalajara": "yellow",
    "Ciudad de México": "yellow",
    "Tegucigalpa": "yellow",
    "Havana": "yellow",
    "Santo Domingo": "yellow"
};

/* Connections (adjacency list).
   NOTE: If you want to match your physical board exactly, edit here.
*/
const ADJ = {
    // West / Red
    "Seattle": ["Calgary", "Denver", "San Francisco"],
    "Calgary": ["Seattle", "Denver", "Minneapolis"],
    "San Francisco": ["Seattle", "Los Angeles", "Denver"],
    "Los Angeles": ["San Francisco", "Phoenix", "Guadalajara"],
    "Denver": ["Seattle", "Calgary", "San Francisco", "Phoenix", "Dallas", "Minneapolis"],
    "Phoenix": ["Los Angeles", "Denver", "Dallas", "Monterrey"],
    "Dallas": ["Phoenix", "Denver", "Indianapolis", "Atlanta", "Monterrey"],
    "Minneapolis": ["Calgary", "Denver", "Chicago"],

    // Blue
    "Chicago": ["Minneapolis", "Indianapolis", "Toronto", "New York", "Washington"],
    "Indianapolis": ["Chicago", "Dallas", "Atlanta"],
    "Atlanta": ["Indianapolis", "Dallas", "Washington", "Miami", "New Orleans"],
    "Washington": ["Atlanta", "New York", "Chicago"],
    "New York": ["Washington", "Boston", "Montréal", "Toronto", "Chicago"],
    "Boston": ["New York", "Montréal"],
    "Montréal": ["Boston", "New York", "Toronto"],
    "Toronto": ["Montréal", "New York", "Chicago"],

    // Yellow
    "Miami": ["Atlanta", "New Orleans", "Havana"],
    "New Orleans": ["Atlanta", "Miami", "Ciudad de México", "Havana"],
    "Monterrey": ["Phoenix", "Dallas", "Guadalajara", "Ciudad de México"],
    "Guadalajara": ["Los Angeles", "Monterrey", "Ciudad de México"],
    "Ciudad de México": ["Guadalajara", "Monterrey", "New Orleans", "Tegucigalpa"],
    "Tegucigalpa": ["Ciudad de México", "Havana"],
    "Havana": ["Miami", "New Orleans", "Tegucigalpa", "Santo Domingo"],
    "Santo Domingo": ["Havana"]
};

const ALL_CITIES = Object.keys(ADJ);

/* Hot Zone NA infection rate track (small game) */
const INFECTION_RATE_TRACK = [2, 2, 3, 4];

/* Roles (IDs used by the engine/UI) */
const ROLES = [
    {
        id: "Medic",
        desc: "Treat removes all cubes of the city's color. If a disease is cured, remove all cubes of that color in your city for free (and on arrival)."
    },
    {
        id: "Dispatcher",
        desc: "As an action, move any pawn to a city with another pawn OR move any pawn to a city connected to where that pawn is."
    },
    {
        id: "Researcher",
        desc: "When sharing knowledge, you may give ANY City card (not just the matching city card) to a player in the same city."
    },
    {
        id: "Generalist",
        desc: "You get 1 extra action each turn (5 actions instead of 4)."
    }
];

/* Events with descriptions so the UI can show “what this does” */
const EVENTS = [
    {
        name: "Borrowed Time",
        type: "event",
        timing: "Do Actions",
        desc: "The current player may take 2 additional actions this turn. Play during the Do Actions step. Not an action."
    },
    {
        name: "One Quiet Night",
        type: "event",
        timing: "Any time (not while resolving a card)",
        desc: "Skip the Draw Infection Cards step this turn."
    },
    {
        name: "Airlift",
        type: "event",
        timing: "Any time (not while resolving a card)",
        desc: "Move any 1 pawn to any city."
    },
    {
        name: "Remote Treatment",
        type: "event",
        timing: "Any time (not while resolving a card)",
        desc: "Return any 2 disease cubes from the board to the supply."
    }
];

/* Crisis cards.
   Some are ongoing and change rules until the next Crisis is drawn.
*/
const CRISIS = [
    { name: "Hot Spot", kind: "instant" },
    { name: "Logistics Failure", kind: "instant" },
    { name: "Limited Options", kind: "ongoing" },
    { name: "Planes Grounded", kind: "ongoing" },
    { name: "Contamination", kind: "instant" },
    { name: "Unacceptable Losses", kind: "instant" }
];

/* ---- Expose constants globally (required for classic scripts) ---- */
window.COLORS = COLORS;
window.CITY_COLOR = CITY_COLOR;
window.ADJ = ADJ;
window.ALL_CITIES = ALL_CITIES;
window.INFECTION_RATE_TRACK = INFECTION_RATE_TRACK;
window.ROLES = ROLES;
window.EVENTS = EVENTS;
window.CRISIS = CRISIS;
