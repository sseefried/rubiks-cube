#!/bin/bash

if [ "$SEANSEEFRIED_DOT_ORG_MACHINE" = "" ]; then
  echo "Please set SEANSEEFRIED_DOT_ORG_MACHINE to an SSHable path"
  exit 1
fi

if [ "$SEANSEEFRIED_DOT_ORG_PATH" = "" ]; then
  echo "Please set SEANSEEFRIED_DOT_ORG_PATH to path of remote directory without "
  exit 1
fi

BASE="$SEANSEEFRIED_DOT_ORG_PATH/rubiks"

FULL_BASE="${SEANSEEFRIED_DOT_ORG_MACHINE}:${BASE}"

for i in js/* static/main.css; do
  ssh "$SEANSEEFRIED_DOT_ORG_MACHINE" mkdir -p $BASE/$(dirname $i)
  scp $i "${FULL_BASE}/$i"
done

scp dual-solve.html "${FULL_BASE}/index.html"
