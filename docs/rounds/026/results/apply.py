import sys
def edit(p, old, new):
    s=open(p).read()
    if s.count(old)!=1: sys.exit(f'{p}: {s.count(old)} matches')
    open(p,'w').write(s.replace(old,new))
edit('prompts/system/base.txt','- Target approximately {{language.targetRatio}}% {{language.name}} in dialogue.\n',
 '- Language mix: about {{language.targetRatio}}% of the words in each dialogue line are {{language.name}}, the greeting included (in a 20-word line, about {{language.wordsPer20}} words). Stay within about 10 points of it, under or over.\n- Reach it with short, whole {{language.name}} phrases (greetings, questions, reactions, remarks) that the English around them explains, not a single {{language.name}} formula inside a long English line.\n')
edit('server/src/llm/prompt-builder.js',"      targetRatio: Math.round(targetRatio * 100),\n",
 "      targetRatio: Math.round(targetRatio * 100),\n      // Round 026 (backlog E1): a worked example beside the percentage, from the same ratio, so the two agree.\n      wordsPer20: Math.round(targetRatio * 20),\n")
print('applied')
