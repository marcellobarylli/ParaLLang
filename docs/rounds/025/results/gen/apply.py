# Round 025: applies the Fountain infohazard content (architecture.md Design 1-6, after critique 1) by exact string edits, so YAML comments
# and layout stay as authored. Run from the repo root after the baseline runs.
import sys
def edit(path, old, new):
    s = open(path, encoding='utf8').read()
    if s.count(old) != 1: sys.exit(f'{path}: expected one match for {old[:60]!r}, found {s.count(old)}')
    open(path, 'w', encoding='utf8').write(s.replace(old, new))

edit('content/characters/enemies/letharger_flick.yaml',
     '    - "Hums a jingle that sticks: brainrot it farms, low harm and very high virulence"\n',
     '    # Round 025 (backlog B3): the jingle is a named infohazard; its words are authored per pack in the last objective\'s intent.\n'
     '    - "Hums the Fountain jingle, a brainrot strain native to the other language (low harm, very high virulence): it tacks the jingle onto the end of its lines like a catchphrase; it only works on listeners who understand it, and the player is starting to"\n')

edit('content/world/locations/cracked_fountain.yaml',
     'of your vision, just where you are not looking.\n',
     'of your vision, just where you are not looking. A brass plaque, newer than the fountain, reads: PLEASE DO NOT HUM.\n')

BRIEFING = '''companion_briefing:
  - "Containment notice, the Cracked Fountain: one brainrot strain. Harm: low. Virulence: very high."
  - "Vector: a jingle. It only works on people who understand it. If you understood it, congratulations."
  - "Containment procedure: do not hum along."
'''
for code, lang, jingle, last_neg in [
    ('it', 'Italian', 'Dopo, dopo, domani!', '      - text: "Now!"\n        reason: "English-only; the answer must be in Italian."\n'),
    ('es', 'Spanish', '¡Después, después, mañana!', '      - text: "Now!"\n        reason: "English-only; the answer must be in Spanish."\n'),
]:
    p = f'content/languages/{code}/encounters/cracked_fountain_letharger.yaml'
    edit(p, 'The fountain is quieter."\n', 'The fountain is quieter, and the jingle has almost left your head."\n')
    edit(p, 'escalation:\n', '# Round 025 (backlog B3): a containment notice for the Fountain\'s infohazard, Flick\'s jingle.\n' + BRIEFING + 'escalation:\n')
    edit(p, f'    intent: "The player refuses to put it off and says now, in {lang}."\n',
         f'    intent: "The player refuses to put it off and says now, in {lang}. Flick keeps humming its jingle, \\"{jingle}\\" (later, later, tomorrow), a mild brainrot infohazard that makes listeners put things off. Repeating the jingle or agreeing to later does not pass; a refusal that names later or tomorrow and insists on now passes."\n')
    edit(p, '      - text: "Stop!"\n', '      - text: "Stop moving!"\n')
    edit(p, last_neg, last_neg + f'      - text: "{jingle}"\n        reason: "Humming Flick\'s jingle back puts it off; it does not insist on now."\n')
print('applied')
