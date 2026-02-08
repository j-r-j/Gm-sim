#!/bin/bash
# CI checks hook - runs lint, test, and format checks
# Exit code 2 blocks Claude from stopping so it can fix failures

errors=""

echo "=== Lint ==="
lint_output=$(npm run lint 2>&1)
lint_exit=$?
if [ $lint_exit -ne 0 ]; then
  errors="${errors}\n=== LINT FAILED ===\n${lint_output}\n"
fi

echo "=== Tests ==="
test_output=$(npm test 2>&1)
test_exit=$?
if [ $test_exit -ne 0 ]; then
  errors="${errors}\n=== TESTS FAILED ===\n${test_output}\n"
fi

echo "=== Format ==="
format_output=$(npm run format:check 2>&1)
format_exit=$?
if [ $format_exit -ne 0 ]; then
  errors="${errors}\n=== FORMAT CHECK FAILED ===\n${format_output}\n"
fi

if [ -n "$errors" ]; then
  echo -e "$errors" >&2
  exit 2
fi

echo "All CI checks passed!"
exit 0
