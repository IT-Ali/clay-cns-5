#!/bin/sh
# tools/job.sh <dir> <name> <file.js> : drops a job into a running probe server and waits for its result
d="$1"; n="$2"; f="$3"
rm -f "$d/$n.json"; cp "$f" "$d/jobs/$n.js.tmp" && mv "$d/jobs/$n.js.tmp" "$d/jobs/$n.js"
i=0; while [ ! -f "$d/$n.json" ] && [ $i -lt 3000 ]; do sleep 0.2; i=$((i+1)); done
cat "$d/$n.json"
