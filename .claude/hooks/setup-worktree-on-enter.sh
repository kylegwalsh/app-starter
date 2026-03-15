#!/bin/bash

# Runs after EnterWorktree or on SessionStart — sets up any worktrees that are
# missing .sst/platform. Uses git worktree list so we don't have to parse the
# uncertain tool_response format.

MAIN_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SETUP_SCRIPT="$MAIN_ROOT/scripts/setup-worktree.ts"

# Skip stdin (not needed here)
cat > /dev/null

# Don't run when Claude is launched in the main repo root
if [ "$PWD" = "$MAIN_ROOT" ]; then
  exit 0
fi

git -C "$MAIN_ROOT" worktree list --porcelain \
  | grep "^worktree " \
  | sed 's/^worktree //' \
  | tail -n +2 \
  | while IFS= read -r wt_path; do
      if [ ! -e "$wt_path/.sst/platform" ]; then
        echo "Setting up worktree at $wt_path..."
        cd "$wt_path" && bun "$SETUP_SCRIPT"
      fi
    done
