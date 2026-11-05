#!/bin/bash
# Round 048 live runs: each member's deeper tier at count 3, it then es, one after another.
cd /work/ParaLLang
out=docs/rounds/048/results
for member in butchers_stall cracked_fountain old_bookshop; do
  for lang in it es; do
    start=$(date -u +%H:%M:%S)
    TARGET_LANGUAGE=$lang node server/scripts/play-market.js --provider codex-cli --party --member $member --tier 3 --out $out/party-$member-$lang.json > $out/party-$member-$lang.log 2>&1; rc=$?
    echo "$member $lang $start-$(date -u +%H:%M:%S) exit $rc" >> $out/live-times.txt
  done
done
