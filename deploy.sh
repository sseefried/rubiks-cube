#!/bin/bash

BASE=/home/sseefried/sites/seanseefried.com/public/rubiks

for i in js/* static/main.css; do
  ssh playspace mkdir -p $BASE/$(dirname $i)
  scp $i playspace:$BASE/$i
done

scp dual-solve.html playspace:$BASE/index.html
