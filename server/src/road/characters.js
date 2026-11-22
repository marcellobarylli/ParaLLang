// Round 144: who stands at a site of The Journey 2. There are no assets and no authored cast: a character is
// drawn from what the conversation is about. Its trade comes from the roles of the curriculum unit (content, so a
// unit about ordering is met by waiters and landladies) and the rest (name, temperament, habits, looks, voice) from
// the pools below, in the style guide's voice: trades, guilds and paperwork taken seriously, the absurd treated as
// ordinary. Pure: the same seed, site, step and unit give the same character on every call.
//
// The owner asked for placeholders, "no assets needed, just descriptions": the sheet's `appearance` is the
// description, and the web client shows it in words beside a plain standing figure.

import { hash } from './terrain.js';

const FIRST = ['Barnaby', 'Ottoline', 'Mungo', 'Perpetua', 'Ignatius', 'Dorcas', 'Septimus', 'Eudora', 'Aloysius', 'Winifred', 'Horatio', 'Prudence', 'Cuthbert', 'Mafalda', 'Leopold', 'Hepzibah', 'Ambrose', 'Clementina', 'Tobias', 'Griselda', 'Erasmus', 'Philippa', 'Bartholomew', 'Sidonie', 'Fergus', 'Ludmilla', 'Osbert', 'Tabitha', 'Wilfred', 'Araminta', 'Gideon', 'Bettina', 'Thaddeus', 'Marigold', 'Lazlo', 'Henrietta'];
const LAST = ['Thrupp', 'Crumb', 'Wattle', 'Pennyfeather', 'Gristle', 'Tuffet', 'Quillfeather', 'Nettlebed', 'Marrow', 'Sprocket', 'Dimwiddy', 'Hobbleton', 'Fennel', 'Stoat', 'Underhedge', 'Bracket', 'Tallow', 'Mudlark', 'Pocket', 'Windlestraw', 'Clodpole', 'Garnish', 'Inkpen', 'Ladle', 'Thimble', 'Scuttle', 'Parsnip', 'Lintel', 'Oddfellow', 'Brisket', 'Wimple', 'Cobbett', 'Furrow', 'Saltmarsh', 'Hinge', 'Larder'];
const TONES = [
  'weary and exact, like a clerk at the end of a very long form',
  'cheerfully mistaken about nearly everything and generous with it',
  'pompous in a small way, as if promoted once, long ago, and never over it',
  'kindly and vague, with the air of someone who has put the point down somewhere',
  'brisk and practical, and faintly offended by anything that is not',
  'gloomy with great relish, a connoisseur of things going wrong',
  'literal-minded to a degree that has got them into trouble with poets',
  'conspiratorial, as though every remark were a secret they should not really be telling',
  'grandly formal, in a manner that the surroundings do nothing to support',
  'placid beyond reason, having decided some years ago to stop being surprised',
  'eager and slightly breathless, like someone who has waited all day for a customer',
  'suspicious on principle, though never of the right thing',
];
const QUIRKS = [
  'Keeps a ledger of everything said to them and reads the last line back for accuracy',
  'Refers to the guild rulebook for matters the rulebook was never meant to cover',
  'Treats the weather as a personal acquaintance who has let them down',
  'Has a rubber stamp and is looking for a reason to use it',
  'Measures distances in sandwiches, since that is what a walk costs',
  'Believes the road moves at night and has evidence, which is at home',
  'Is saving up for a hat and mentions the fund at every opportunity',
  'Counts the people who pass and is disappointed when the total is even',
  'Explains a thing by comparing it with something far more complicated',
  'Has a cousin who did it better, whatever it is',
  'Considers the horizon to be badly managed and has written to someone about it',
  'Addresses their own equipment by name and apologises to it when things go wrong',
  'Has been told to smile more by the guild and is doing so, under protest',
  'Collects the last words of conversations and is one short of the set',
  'Regards silence as a form of paperwork that has not been filled in',
  'Offers a small biscuit as a mark of official approval and takes it back if things go badly',
  'Keeps strictly to opening hours that nobody else has ever seen written down',
  'Is certain they have met the player before and is polite about being wrong',
  'Thinks in lists and numbers the points out loud',
  'Has a great respect for queues and forms one even when alone',
  'Is training a successor who has not turned up yet, and leaves pauses for them',
  'Distrusts anything that was not in the original instructions, which are lost',
  'Narrates their own tidy habits as though dictating a manual',
  'Holds that everything was better before the last reorganisation, of which there have been nine',
];
const BUILDS = ['A tall, folded person', 'A small, square figure', 'A round and unhurried shape', 'A thin, anxious presence', 'A broad figure built like a cupboard', 'A stooped and careful soul', 'Someone of no particular height, which they regard as a professional asset', 'A long-limbed figure who has clearly been assembled in a hurry'];
const GARB = ['in a coat with more pockets than the law requires', 'under a hat that has seen service', 'in an apron stiff with official starch', 'wrapped in a scarf of regulation length', 'in boots that disagree with each other', 'wearing a waistcoat the colour of old tea', 'in a uniform that belongs to a different job', 'in a cloak patched with pieces of other cloaks'];
const PROPS = ['holding a clipboard like a shield', 'beside a folding table and a sign that is nearly spelled right', 'with a lantern that is lit in broad daylight, to be safe', 'leaning on a staff with notches cut for every complaint', 'carrying a bag that clinks in an administrative way', 'next to a small bell marked RING FOR ATTENTION and a larger one marked DO NOT', 'sitting on a trunk they will not discuss', 'guarding a teapot with their life'];
const FAREWELLS = [
  'stamps something, possibly you, and waves you on.',
  'declares the matter settled and returns to work with visible relief.',
  'makes a careful note, underlines it twice and steps out of your way.',
  'nods the nod of a professional whose day has, against expectation, gone well.',
  'shakes your hand for exactly the regulation time and points you up the road.',
  'announces that this will go in the report, and that the report will be favourable.',
  'hands you an invisible receipt and seems hurt when you do not check it.',
  'looks at the sky, then at you, and allows that things could be worse.',
];
export const REVIEW_ROLES = [
  { title: 'Wandering Examiner', premise: 'asks travellers for things they already know, for the plain pleasure of being told them again' },
  { title: 'Rememberer', premise: 'is paid to remember things on behalf of other people and has mislaid a few of yours' },
  { title: 'Collector of Second Tellings', premise: 'holds that nothing is properly said until it has been said twice, some days apart' },
  { title: 'Inspector of Loose Ends', premise: 'follows the road behind people and tidies up whatever they learned and left lying about' },
  { title: 'Ferryman of the Short Way Back', premise: 'takes passengers a little way into last week and expects conversation for the fare' },
];
export const CHECKPOINT_ROLES = [
  { title: 'Gatekeeper of the Next Bit', premise: 'guards the part of the road that comes after this part, and takes the job at its word' },
  { title: 'Guild Assessor, Roads and Tongues', premise: 'has a form with a box for each thing you should be able to say by now, and a very sharp pencil' },
  { title: 'Toll Collector of Proven Sentences', premise: 'the toll is paid in things said correctly, and no change is given' },
  { title: 'Warden of the Milestone', premise: 'will not let the milestone be passed by anyone who cannot explain how they got this far' },
];

const PLACE_ADJECTIVES = ['Patient', 'Second', 'Reluctant', 'Windy', 'Lower', 'Upper', 'Crooked', 'Sensible', 'Lesser', 'Greater', 'Mislaid', 'Honest', 'Borrowed', 'Nearly', 'Quiet', 'Further', 'Hither', 'Leftover', 'Unlikely', 'Punctual',
  'Modest', 'Thoughtful', 'Sideways', 'Provisional', 'Tidy', 'Stubborn', 'Polite', 'Overdue', 'Middling', 'Dependable', 'Absent', 'Earnest', 'Third', 'Outer', 'Hopeful', 'Damp', 'Respectable', 'Forgotten', 'Occasional', 'Considerable'];
const PLACE_NOUNS = {
  shore: ['Landing', 'Strand', 'Jetty', 'Shallows', 'Reedbed', 'Ford', 'Mudflat', 'Slipway', 'Sandbar', 'Cove'],
  meadow: ['Meadow', 'Crossroads', 'Common', 'Stile', 'Pasture', 'Milestone', 'Green', 'Paddock', 'Hayfield', 'Signpost'],
  forest: ['Clearing', 'Copse', 'Hollow', 'Glade', 'Thicket', 'Stump', 'Spinney', 'Dell', 'Coppice', 'Windfall'],
  highland: ['Ridge', 'Shoulder', 'Cairn', 'Saddle', 'Outcrop', 'Ledge', 'Scree', 'Bluff', 'Tor', 'Knoll'],
  snow: ['Pass', 'Drift', 'Summit Hut', 'Col', 'Snowfield', 'Cornice', 'Shelter', 'Icefall'],
  water: ['Landing'],
};
// About two sites in five carry a qualifier, so that two sites near each other seldom share a name.
const PLACE_QUALIFIERS = ['by the Old Stone', 'under the Hill', 'of the Two Opinions', 'beyond the Hedge', 'on the Wrong Side', 'of the Last Inspection', 'past the Bend', 'by Appointment', 'of No Fixed Purpose', 'before the Rain', 'at the Usual Place', 'of the Seventh Draft', 'near Enough', 'behind the Times', 'of the Short Straw'];

// A stream of hashed numbers for one subject: draw(k) is in [0, 1) and differs for every k.
function drawer(seed, a, b) { return (k) => hash(a * 131 + k * 17, b * 137 - k * 29, seed + 500 + k); }
const pickFrom = (list, value) => list[Math.min(list.length - 1, Math.floor(value * list.length))];

/** The name of a site: "The Patient Meadow". Fixed by the seed and the site. */
export function placeName(seed, node) {
  const draw = drawer(seed, node.i, node.j);
  const qualifier = draw(3) < 0.4 ? ` ${pickFrom(PLACE_QUALIFIERS, draw(4))}` : '';
  return `The ${pickFrom(PLACE_ADJECTIVES, draw(1))} ${pickFrom(PLACE_NOUNS[node.biome] ?? PLACE_NOUNS.meadow, draw(2))}${qualifier}`;
}

/**
 * The character of an activity at a site, as a character sheet (content-loader.js's characterSchema).
 *
 *   seed, node   the road's seed and the site ({ i, j })
 *   step         how many conversations the learner has finished: the same site holds someone new on a later pass
 *   role         { title, premise }: a role of the unit, a review role or a checkpoint role
 *   ratio        the stage's share of target language
 *   focus        { vocabulary, grammar }: what the conversation is about, for the sheet
 */
export function characterFor({ seed, node, step, role, ratio, focus }) {
  const draw = drawer(seed + step * 7919, node.i, node.j);
  const name = `${pickFrom(FIRST, draw(1))} ${pickFrom(LAST, draw(2))}`;
  const quirkA = pickFrom(QUIRKS, draw(3));
  let quirkB = pickFrom(QUIRKS, draw(4));
  if (quirkB === quirkA) quirkB = QUIRKS[(QUIRKS.indexOf(quirkA) + 7) % QUIRKS.length];
  const premise = role.premise.charAt(0).toUpperCase() + role.premise.slice(1);
  const appearance = `${pickFrom(BUILDS, draw(5))} ${pickFrom(GARB, draw(6))}, ${pickFrom(PROPS, draw(7))}. ${name.split(' ')[0]} is a ${role.title} and ${role.premise}.`;
  const kinds = ['female', 'male', 'creature', 'funny'];
  return {
    id: `road_${node.i}_${node.j}_${step}`,
    name,
    species: role.title,
    personality: { tone: pickFrom(TONES, draw(8)), quirks: [premise, quirkA, quirkB], humour_style: 'In the manner of the style guide: the narrator dry and fond, the character entirely in earnest' },
    appearance,
    combat_style: 'earnest conversation',
    difficulty: 1,
    language_profile: { base_target_ratio: ratio, vocabulary_focus: [focus.vocabulary], grammar_focus: [focus.grammar] },
    defeat_condition: { type: 'comprehension_and_response', description: focus.vocabulary },
    saveable: false,
    voice: { kind: pickFrom(kinds, draw(9)), pitch: Math.round((0.8 + 0.5 * draw(10)) * 100) / 100, rate: Math.round((0.9 + 0.2 * draw(11)) * 100) / 100 },
    farewell: `${name.split(' ')[0]} ${pickFrom(FAREWELLS, draw(12))}`,
    // A colour for the placeholder figure, as a hue in [0, 1).
    hue: Math.round(draw(13) * 100) / 100,
  };
}

/** A role by a hashed draw: `index` picks among the list so neighbouring sites differ. */
export function roleFor(seed, node, step, roles) {
  return pickFrom(roles, hash(node.i * 53 + step, node.j * 59 - step, seed + 601));
}
