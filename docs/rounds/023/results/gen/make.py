import json, sys, os
OUT = []
def dump(path, data):
    OUT.append([path, data])

def entry(id, kind, target, pos, meanings, variants, example, refs, note=None):
    e = {'id': id, 'kind': kind, 'target': target, 'part_of_speech': pos, 'accepted_translations': meanings,
         'surface_variants': variants, 'accent_insensitive': False, 'example': {'target': example[0], 'english': example[1]}}
    if note: e['note'] = note
    e['reference_ids'] = refs
    return e

def objective(id, prompt, intent, targets, constraints, accepted, negatives, meaning, refs, nxt):
    return {'id': id, 'prompt': prompt, 'intent': intent, 'target_vocabulary_ids': targets, 'required_target_groups': [targets],
            'grammar_constraints': constraints, 'accepted_examples': accepted,
            'negative_examples': [{'text': t, 'reason': r} for t, r in negatives], 'reference_meaning': meaning,
            'hint_limit': 2, 'next_objective': nxt, 'assessment_reference_ids': refs}

def encounter(id, character, party_of, description, resolved, objectives):
    return {'id': id, 'character': character, 'party_of': party_of, 'type': 'dialogue',
            'initial_prompt_template': 'encounter/greeting.txt', 'turn_prompt_template': 'encounter/dialogue_turn.txt',
            'defeat_condition': {'type': 'comprehension_and_response', 'description': description}, 'max_turns': 20,
            'resolved_message': resolved, 'escalation': {'target_ratio_increase_per_turn': 0.05}, 'objectives': objectives}

L = {'it': 'Italian', 'es': 'Spanish'}
W = {'it': lambda w: f'https://en.wiktionary.org/wiki/{w}', 'es': lambda w: f'https://en.wiktionary.org/wiki/{w}'}

# ---------------- Mortimer ----------------
mort = {
 'it': dict(
   refs=[('treccani-ancora', 'Treccani, Vocabolario: ancora', 'https://www.treccani.it/vocabolario/ancora2/'),
         ('wiktionary-mi-piace', 'Wiktionary: mi piace (Italian)', 'https://en.wiktionary.org/wiki/mi_piace')],
   e1=entry('mi_piace', 'phrase', 'mi piace', 'phrase', ['I like it', 'I like'], ['mi piace'], ('Mi piace il salame.', 'I like salami.'), ['treccani-piacere', 'wiktionary-mi-piace'],
            'Literally "it pleases me": the thing liked is the subject. One thing: mi piace.'),
   e2=entry('ancora', 'word', 'ancora', 'adverb', ['more', 'again', 'some more'], ['ancora', "ancora un po'"], ("Ancora un po', per favore.", 'A little more, please.'), ['treccani-ancora'],
            "Ancora un po': a little more. Ancora also means still and yet."),
   like_ok=['Mi piace!', 'Mi piace molto, Mortimer.', 'Mi piace, è buonissimo.'],
   like_bad=[('I like it.', 'English-only; it does not use the Italian phrase.'), ('Non mi piace.', 'A negated verdict is not liking it.'),
             ('Ti piace?', 'It asks Mortimer instead of giving the player\'s own verdict.'), ('Mortimer says mi piace.', 'It reports someone else\'s words.')],
   more_ok=['Ancora, per favore!', "Ancora un po'?", 'Posso averne ancora?'],
   more_bad=[('More, please.', 'English-only; it does not use the Italian word.'), ('Non ancora.', '"Not yet" refuses rather than asks for more.'),
             ('Ancora is Italian for more.', 'It discusses the word rather than asking for more.')],
   prefs=['treccani-piacere'], mrefs=['treccani-ancora'], l='Italian', more_word='ancora', like_word='mi piace'),
 'es': dict(
   refs=[('rae-gustar', 'RAE, Diccionario de la lengua española: gustar', 'https://dle.rae.es/gustar'),
         ('rae-mas', 'RAE, Diccionario de la lengua española: más', 'https://dle.rae.es/m%C3%A1s'),
         ('rae-poco', 'RAE, Diccionario de la lengua española: poco', 'https://dle.rae.es/poco')],
   e1=entry('me_gusta', 'phrase', 'me gusta', 'phrase', ['I like it', 'I like'], ['me gusta'], ('Me gusta el chorizo.', 'I like chorizo.'), ['rae-gustar'],
            'Literally "it pleases me": the thing liked is the subject. One thing: me gusta.'),
   e2=entry('un_poco_mas', 'phrase', 'un poco más', 'phrase', ['a little more', 'some more', 'more'], ['un poco más'], ('Un poco más, por favor.', 'A little more, please.'), ['rae-mas', 'rae-poco'],
            'Más alone also means more; the game asks for the whole phrase.'),
   like_ok=['¡Me gusta!', 'Me gusta mucho, Mortimer.', 'Me gusta, está buenísimo.'],
   like_bad=[('I like it.', 'English-only; it does not use the Spanish phrase.'), ('No me gusta.', 'A negated verdict is not liking it.'),
             ('¿Te gusta?', 'It asks Mortimer instead of giving the player\'s own verdict.'), ('Mortimer says me gusta.', 'It reports someone else\'s words.')],
   more_ok=['¡Un poco más, por favor!', '¿Me das un poco más?', 'Quiero un poco más.'],
   more_bad=[('More, please.', 'English-only; it does not use the Spanish phrase.'), ('No quiero un poco más.', 'It refuses rather than asks for more.'),
             ('Un poco más is Spanish for a little more.', 'It discusses the phrase rather than asking for more.')],
   prefs=['rae-gustar'], mrefs=['rae-mas', 'rae-poco'], l='Spanish', more_word='un poco más', like_word='me gusta'),
}
fl = {
 'it': dict(
   refs=[('treccani-andare', 'Treccani, Vocabolario: andare', 'https://www.treccani.it/vocabolario/andare/'),
         ('treccani-insieme', 'Treccani, Vocabolario: insieme', 'https://www.treccani.it/vocabolario/insieme/'),
         ('wiktionary-andiamo', 'Wiktionary: andiamo (Italian)', 'https://en.wiktionary.org/wiki/andiamo')],
   e1=entry('andiamo', 'word', 'andiamo', 'verb', ["let's go", 'we go', 'we are going'], ['andiamo'], ('Andiamo al mercato!', "Let's go to the market!"), ['treccani-andare', 'wiktionary-andiamo'],
            'From andare, to go: andiamo is both "we go" and "let\'s go".'),
   e2=entry('insieme', 'word', 'insieme', 'adverb', ['together'], ['insieme'], ('Andiamo insieme.', "Let's go together."), ['treccani-insieme']),
   go_ok=['Andiamo!', 'Andiamo, Flick!', 'Dai, andiamo adesso.'], go_bad=[("Let's go.", 'English-only; it does not use the Italian word.'), ('Non andiamo.', 'It refuses to go.'), ('Flick says andiamo.', 'It reports someone else\'s words.')],
   tog_ok=['Insieme.', 'Andiamo insieme!', 'Insieme, Flick.'], tog_bad=[('Together.', 'English-only; it does not use the Italian word.'), ('Non insieme.', 'It refuses to go together.'), ('Insieme means together.', 'It discusses the word rather than saying it to Flick.')],
   grefs=['treccani-andare'], trefs=['treccani-insieme'], l='Italian', go='andiamo', tog='insieme'),
 'es': dict(
   refs=[('rae-ir', 'RAE, Diccionario de la lengua española: ir', 'https://dle.rae.es/ir'),
         ('rae-junto', 'RAE, Diccionario de la lengua española: junto', 'https://dle.rae.es/junto'),
         ('wiktionary-vamos', 'Wiktionary: vamos (Spanish)', 'https://en.wiktionary.org/wiki/vamos')],
   e1=entry('vamos', 'word', 'vamos', 'verb', ["let's go", 'we go', 'we are going'], ['vamos'], ('¡Vamos al mercado!', "Let's go to the market!"), ['rae-ir', 'wiktionary-vamos'],
            'From ir, to go: vamos is both "we go" and "let\'s go".'),
   e2=entry('juntos', 'word', 'juntos', 'adverb', ['together'], ['juntos'], ('Vamos juntos.', "Let's go together."), ['rae-junto'],
            'Juntos agrees with the people going together; a mixed or male group is juntos.'),
   go_ok=['¡Vamos!', '¡Vamos, Flick!', 'Venga, vamos ahora.'], go_bad=[("Let's go.", 'English-only; it does not use the Spanish word.'), ('No vamos.', 'It refuses to go.'), ('Flick says vamos.', 'It reports someone else\'s words.')],
   tog_ok=['Juntos.', '¡Vamos juntos!', 'Juntos, Flick.'], tog_bad=[('Together.', 'English-only; it does not use the Spanish word.'), ('No juntos.', 'It refuses to go together.'), ('Juntos means together.', 'It discusses the word rather than saying it to Flick.')],
   grefs=['rae-ir'], trefs=['rae-junto'], l='Spanish', go='vamos', tog='juntos'),
}
mg = {
 'it': dict(
   refs=[('treccani-meraviglioso', 'Treccani, Vocabolario: meraviglioso', 'https://www.treccani.it/vocabolario/meraviglioso/'),
         ('treccani-nuovo', 'Treccani, Vocabolario: nuovo (di nuovo)', 'https://www.treccani.it/vocabolario/nuovo/')],
   e1=entry('meraviglioso', 'word', 'meraviglioso', 'adjective', ['wonderful', 'marvellous'], ['meraviglioso', 'meravigliosa'], ('La storia è meravigliosa.', 'The story is wonderful.'), ['treccani-meraviglioso'],
            'Agrees with its noun: la storia è meravigliosa, il libro è meraviglioso.'),
   e2=entry('di_nuovo', 'phrase', 'di nuovo', 'adverbial_phrase', ['again'], ['di nuovo'], ('Leggi di nuovo, per favore.', 'Read it again, please.'), ['treccani-nuovo']),
   fragment='Journathan parla con il mare in due lingue. Il mare risponde in una lingua sola: la sua.', storia='la storia',
   agree='The adjective agrees with la storia (feminine): meravigliosa; meraviglioso only with an explicit masculine referent such as il racconto or il libro.',
   praise_ok=['La storia è meravigliosa!', 'Meravigliosa!', 'È una storia meravigliosa, Marginalia.'],
   praise_bad=[('It was wonderful.', 'English-only; it does not use the Italian word.'), ('La storia è meraviglioso.', 'La storia is feminine; the adjective must be meravigliosa.'),
               ('Non è meravigliosa.', 'A negated verdict is not praise.'), ('Journathan says it is meravigliosa.', 'It reports someone else\'s words.')],
   again_ok=['Di nuovo, per favore!', 'Puoi leggerla di nuovo?', 'Leggi di nuovo, Marginalia.'],
   again_bad=[('Again, please.', 'English-only; it does not use the Italian phrase.'), ('Lo leggo di nuovo.', 'The player would read it again; the objective is to ask Marginalia to read.'),
              ('Di nuovo means again.', 'It discusses the phrase rather than asking her.')],
   prefs=['treccani-meraviglioso'], arefs=['treccani-nuovo'], l='Italian', praise='meravigliosa', again='di nuovo'),
 'es': dict(
   refs=[('rae-precioso', 'RAE, Diccionario de la lengua española: precioso', 'https://dle.rae.es/precioso'),
         ('rae-vez', 'RAE, Diccionario de la lengua española: vez (otra vez)', 'https://dle.rae.es/vez')],
   e1=entry('precioso', 'word', 'precioso', 'adjective', ['beautiful', 'lovely', 'wonderful'], ['precioso', 'preciosa'], ('La historia es preciosa.', 'The story is beautiful.'), ['rae-precioso'],
            'Agrees with its noun: la historia es preciosa, el cuento es precioso.'),
   e2=entry('otra_vez', 'phrase', 'otra vez', 'adverbial_phrase', ['again'], ['otra vez'], ('Lee otra vez, por favor.', 'Read it again, please.'), ['rae-vez']),
   fragment='Journathan habla con el mar en dos lenguas. El mar responde en una sola lengua: la suya.', storia='la historia',
   agree='The adjective agrees with la historia (feminine): preciosa; precioso only with an explicit masculine referent such as el cuento or el libro.',
   praise_ok=['¡La historia es preciosa!', '¡Preciosa!', 'Es una historia preciosa, Marginalia.'],
   praise_bad=[('It was wonderful.', 'English-only; it does not use the Spanish word.'), ('La historia es precioso.', 'La historia is feminine; the adjective must be preciosa.'),
               ('No es preciosa.', 'A negated verdict is not praise.'), ('Journathan says it is preciosa.', 'It reports someone else\'s words.')],
   again_ok=['¡Otra vez, por favor!', '¿Puedes leerla otra vez?', 'Lee otra vez, Marginalia.'],
   again_bad=[('Again, please.', 'English-only; it does not use the Spanish phrase.'), ('Lo leo otra vez.', 'The player would read it again; the objective is to ask Marginalia to read.'),
              ('Otra vez means again.', 'It discusses the phrase rather than asking her.')],
   prefs=['rae-precioso'], arefs=['rae-vez'], l='Spanish', praise='preciosa', again='otra vez'),
}

for code in ['it', 'es']:
    m = mort[code]; lang = m['l']
    dump(f'languages/{code}/vocabulary/mortimer_party.yaml', {'version': f'mortimer-party-{code}-v1', 'references': [{'id': i, 'title': t, 'url': u} for i, t, u in m['refs']], 'entries': [m['e1'], m['e2']]})
    dump(f'languages/{code}/encounters/mortimer_tasting.yaml', encounter('mortimer_tasting', 'characters/enemies/charcutier_mortimer.yaml', 'butchers_stall_charcutier',
        f'Player says they like Mortimer\'s slice and asks for more, in {lang}', 'Mortimer weighs your appetite and declares it certified ham-tier.', [
        objective('like_it', f'Mortimer, now in your party, offers you a slice from his travelling hamper. Tell him you like it, using {lang}.',
            f'Mortimer, now travelling in the player\'s party, has cut the player one slice from his travelling hamper and waits for the player\'s own verdict. He does not say "{m["like_word"]}" or "{m["more_word"]}" himself before the player has.',
            [m['e1']['id']], [f'The player says in {lang} that they like the slice, in their own words.', 'One slice: the singular form.', 'Reject English-only answers, negated verdicts, questions back to Mortimer, and quotations.'],
            m['like_ok'], m['like_bad'], 'The player says they like the slice.', m['prefs'], 'ask_more'),
        objective('ask_more', f'Ask Mortimer for more, using {lang}.', 'The player asks Mortimer for more of the meat.', [m['e2']['id']],
            [f'The player asks for more in {lang}.', 'Reject English-only requests, refusals, and talk about the word.'], m['more_ok'], m['more_bad'], 'The player asks for more.', m['mrefs'], None)]))
    f = fl[code]
    dump(f'languages/{code}/vocabulary/flick_party.yaml', {'version': f'flick-party-{code}-v1', 'references': [{'id': i, 'title': t, 'url': u} for i, t, u in f['refs']], 'entries': [f['e1'], f['e2']]})
    dump(f'languages/{code}/encounters/flick_slow_walk.yaml', encounter('flick_slow_walk', 'characters/enemies/letharger_flick.yaml', 'cracked_fountain_letharger',
        f'Player gets Flick moving and keeps it beside them, in {lang}', 'Flick moves. Now. Together with you. Historians will doubt it.', [
        objective('lets_go', f'Flick, now in your party, wants to stay put for five more minutes. Get it moving: say let\'s go, using {lang}.',
            f'Flick, now travelling in the player\'s party, has sat down and wants to stay "five more minutes". The player must get it moving. Flick does not say "{f["go"]}" or "{f["tog"]}" itself before the player has.',
            [f['e1']['id']], [f'The player tells Flick in {lang} that they are going now.', 'Reject English-only answers, refusals, and quotations.'], f['go_ok'], f['go_bad'], "The player says let's go.", f['grefs'], 'together'),
        objective('together', f'Flick wanders off again. Tell it you go together, using {lang}.', 'Flick keeps drifting away; the player says they go together.', [f['e2']['id']],
            [f'The player says in {lang} that they go together.', 'Reject English-only answers, refusals, and talk about the word.'], f['tog_ok'], f['tog_bad'], 'The player says they go together.', f['trefs'], None)]))
    g = mg[code]
    dump(f'languages/{code}/vocabulary/marginalia_party.yaml', {'version': f'marginalia-party-{code}-v1', 'references': [{'id': i, 'title': t, 'url': u} for i, t, u in g['refs']], 'entries': [g['e1'], g['e2']]})
    dump(f'languages/{code}/encounters/marginalia_fragment.yaml', encounter('marginalia_fragment', 'characters/enemies/bookworm_marginalia.yaml', 'old_bookshop_bookworm',
        f'Player praises Marginalia\'s fragment of The Journey and asks her to read it again, in {lang}', 'Marginalia reads it again, slower, and annotates your face.', [
        objective('praise_story', f'Marginalia, now in your party, reads you a fragment of The Journey. Tell her the story is wonderful, using {lang}.',
            f'Marginalia, now travelling in the player\'s party, reads aloud this fragment of The Journey in her greeting, exactly: "{g["fragment"]}" Then she asks what the player thought of {g["storia"]}. She does not say "{g["praise"]}" or "{g["again"]}" herself before the player has.',
            [g['e1']['id']], [f'The player gives their own verdict in {lang} that the story is wonderful.', g['agree'], 'Reject English-only answers, negated verdicts, and quotations.'],
            g['praise_ok'], g['praise_bad'], 'The player says the story is wonderful.', g['prefs'], 'read_again'),
        objective('read_again', f'Ask Marginalia to read it again, using {lang}.', 'The player asks Marginalia to read the fragment again.', [g['e2']['id']],
            [f'The player asks Marginalia in {lang} to read it again.', 'Reject English-only requests, the player saying they will read it themself, and talk about the phrase.'],
            g['again_ok'], g['again_bad'], 'The player asks her to read it again.', g['arefs'], None)]))
json.dump(OUT, open(sys.argv[1], 'w'), ensure_ascii=False)
print(len(OUT), 'files')
