#!/bin/bash

abc=(1 2 3 4 5 6 7 8 9 a b c d e f 0);
IFS=,;
eval echo {"${abc[*]}"}/{"${abc[*]}"} | sed -e 's/ /\n/g' | xargs -I{} mkdir -p $1/{}

