# Content report: round 144 (curriculum stages A1.2 to B1.2)

Written by the subagent of the session that authored stages 2 to 6 of the curriculum (the skeleton and the Italian
and Spanish words of each), on 2026-11-22 (14:44 to 15:23 UTC), and kept as it was handed back, but for layout. Stage
A1.1 was written by Claude and was the subagent's exemplar. The subagent validated each stage with
`node server/scripts/check-curriculum.js` before starting the next. Its list below is what it was not sure of: it is
the owner's reading list for the review of the language.

Stages 2 to 6 are complete and validated (a1_2, a2_1, a2_2, b1_1, b1_2), three files each, checked after every stage.

Last check output:

```
es: 6 stages (a1_1, a1_2, a2_1, a2_2, b1_1, b1_2), 36 units, 108 lessons, 324 objectives, 487 vocabulary entries
it: 6 stages (a1_1, a1_2, a2_1, a2_2, b1_1, b1_2), 36 units, 108 lessons, 324 objectives, 493 vocabulary entries
```

Per language: 108 lessons (90 new). Vocabulary: it 493 (392 new), es 487 (390 new).

## For the owner's review

**Matching side effects**

- es `este` lists "esta", which also matches "está" (accents are ignored).
- es stage 1 `aprendo` owns "estudio", so "Estudio en la universidad" is credited to it (routine_day.work).
- es `voy_a` owns "vamos a", so it is accepted in invitations_invite.suggest; `que_te_parece` owns "por qué no" (used
  in persuading_propose).
- Bare function words as entries: it `da`, `con`, `come`, `alle`, `era`; es `con`, `tan`, `hay`, `era`, `desde`.
- Fixed-number forms: it `da_ieri` ("da due giorni"), es `desde_ayer` ("desde hace dos días"); other numbers will
  not match.

**Language**

- it: "Quale è più grande?" (usually "Qual è"); "Di secondo vorrei il pollo"; `sono_partito` also lists "sono
  uscito"; "Penso che sia una bella città" uses the congiuntivo before its unit (stage 5).
- es, Spain-specific: "Quedé con un amigo", "Me lo dejé en el bar", "Le llamaré mañana" (leísmo), "¿Voy bien para el
  centro?", "Por mí vale", "Uso la talla mediana".
- Wide synonym lists: it `anziano`/vecchio, es `mayor`/viejo, it `forse`/magari, es `luego`/entonces.
- Stage 6 subjunctive chunks: "se fossi in te", "si me tocara la lotería", "que te vaya bien".
