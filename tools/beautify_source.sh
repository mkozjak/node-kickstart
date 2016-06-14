#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

find $BASEDIR/../src $BASEDIR/../test -type f -name "*.js" -exec node ./node_modules/js-beautify/js/bin/js-beautify.js -r {} \;
