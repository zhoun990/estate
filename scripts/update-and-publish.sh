#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

"$PROJECT_ROOT/scripts/update-dependencies.sh"

cd "$PROJECT_ROOT/react"
npm run p

