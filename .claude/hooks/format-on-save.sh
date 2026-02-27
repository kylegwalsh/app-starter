#!/bin/bash

# Auto-format files with oxc
# Supports both Claude Code (tool_input.file_path) and Cursor (file_path) stdin formats
file_path=$(cat | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.tool_input?.file_path||j.tool_input?.filePath||j.file_path||'')})")

if [ -z "$file_path" ]; then
  exit 0
fi

lint_output=$(bunx oxlint --type-aware --type-check --fix "$file_path" 2>&1)
lint_exit=$?
bunx oxfmt --no-error-on-unmatched-pattern "$file_path"

if [ $lint_exit -ne 0 ]; then
  echo "$lint_output" >&2
  exit 2
fi
