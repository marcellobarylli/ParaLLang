2023-11-271251

Status: #idea
Upstream: [[HUB]]
Tags: 

---

- Dark souls-like storytelling. Ie the lore is hidden in plain sight. There will be entire sections that are potentially more complex language-wise, which do not need to be translated to progress but which give juicy details about the world.
- The backbone of simpler, more crucial stuff is colour coded? (needs to be translated)
- This encourages multiple playthroughs, as you will more fluent with each go through (NG+)
- This will only come into play in intermediate stages maybe? We still have to find the unit of translation (cross-dimensional language corruption)
	- if the granular unit is a word in a sentence, could only be nouns or unconjugated verbs?
	- If the atomic unit is a phrase, could be simpler
		- -> According to RNG, R/S sentences in a paragraph are flipped. The RNG could be biased towards easier / harder sentences, providing an additional knob to scale. This would require an (automated) assessment of sentence difficulty
- Translating phrases back / forwards would be done via voice recognition. Forwards is best because it forces sentence generation. ==The app *Superfluent* has some good inspiration for conversational AI learning - how to make it conversational within an interactive story?==

### Terry Pratchett × meme culture, absurd humour
- Superfluent's basic gameplay units are short conversations about grabbing a coffee, movies etc
- We have dungeon encounters with monsters
- Our basic encounter is having a chat with eg an Imp about grabbing a coffee, movies etc
	- If you like a certain enemy, he can be saved instead of killed (Pokemon style). They can join your party, you can build a relationship with them and have more meaningful conversations over time
	- Just save them as a .json
- Pratchett gives the structure, memes give the texture. The narrator keeps the dry wit, the footnotes and the satire of the mundane. The characters talk like the internet: an Imp who is lowkey judging your coffee order, a [[CHARACTERS#The Trepanners|Trepanner]] whose brain inflation is "a whole vibe", a demon who rates your translation "mid"
- The footnotes can turn into meme formats: "Nobody: / The Imp:", "POV: you just learned the word for oat milk", a narrator who gets ratioed by the characters
- Memes are diegetic. In the lore, [[LORE#memes|memes are life forms]] living in a language, so a meme spreading through the Imps is literally a virulent strain. Brainrot is real here ([[LORE#Infohazards|a mild infohazard]]) and the [[CHARACTERS#The Lethargers|Lethargers]] farm it. The jokes are funny and a threat at the same time
- Each language pack brings its own meme culture: Italian internet slang and humour, not English memes translated. This is real, colloquial language people actually use, so it teaches as well as entertains
- Memes date fast. Lean on evergreen formats and the attitude behind them, rather than this month's reference

# Main Gameplay Loop

## Option A
- You have a companion (possibly a floating bot, or a daemon-like creature, or another humanoid) that translates for you. The text-based game will generate paragraphs in your own language, and you can ask for translations wherever you want. This lets the user tune how much they want the story to progress vs how much they are learning. Potentially everything is dual-language.
	- By starting out in areas that are focused on basic vocabulary, the user will automatically learn these terms first
		- Man, woman, someone asking you for your name, where you come from
		- Boulangerie, charcuterie
		- Cafe, Restaurant, Groceries
	- There should be some direct way of translating words (color-matching)
		- The GUI needs to have 2 buttons: "Translate Word" and "Translate sentence". For either option, each sentence / word will be highlighted (words colored R/G/B for noun/verb/adjective). If it is tapped (or clicked) it will be spoken aloud
		- ==alternative==: Instead of letting the player choose what to translate, auto-highlight a sentence (RNG-based), if the player taps the sentence, it is translated with color matched words. This is necessary to progress the narrative
		- so flow is: sentence translated  -> words translated -> 2 buttons (left: translate more, right: proceed)
		- Don't forget to add repetition. Translated sentences and words need to be stored somewhere for voluntary retrieval and practice (gamify as a personal spellbook somehow, with some activity or something). Also FORCE repitition according to optimal guidelines 
	- Also an option for simply translating nouns, verbs, adjectives without translating the full sentence
- Certain events force you to use your knowledge. Your translator companion is limited during these events. 
- it is very important that everything is spoken by a quirky narrator (or neutral one). 
- So far, this doesn't include player choices (text based adventure). Maybe it could keep it simpler to keep the choices more constrained. We'll see. However, what is the LLM really good for then? It should do the heavy lifting for scene building and character dialogue, while closely following predefined style choices as well as overarching anrrative elements. Maybe sandbox certain components but keep the overall choices clear. Eg allow exploration within an area, but travel between areas is predefined. Also, characters can be generated, but significant ones should be pre defined. (SEE INFLECTION POINT)

### Inflection Point
- LLM prompting is separate to translation. Prompting should be done in English prior to inflection, and in French post-inflection.
- At the inflection point, the majority of the sentences will be in the exo-language and need to be translated back into the native language.

### Collision
- At collision, the narrative of the 2 worlds will be entirely in the language of the respectively other world, and need to be translated back entirely.

## Option B (Black Notebook)
# Leveling Up and World Scaling

- In the beginning, the only unlocked levels are boulangerie, boutique, etc. As you level up, you gain access to places like bibliotheque, university
- Have  a world map that has a fog of war that can be dispelled







---
# References
- 
---
1. 