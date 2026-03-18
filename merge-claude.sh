#!/bin/bash
BRANCH=$(git branch -r | grep claude | tail -1 | tr -d ' ')
echo "Mergowanie: $BRANCH"
git fetch origin
git checkout $BRANCH -- dashboard-4dx.html 2>/dev/null
git checkout $BRANCH -- lead-detail.html 2>/dev/null
git add -A
git commit -m "merge: $BRANCH" 2>/dev/null || echo "Nic do commitowania"
git pull --no-rebase -X ours
git push
