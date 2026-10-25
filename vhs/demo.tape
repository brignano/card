# Demo recording for `npx brignano`.
# Regenerate with:  vhs vhs/demo.tape   (requires: brew install vhs)
# Renders the animated banner, the live card, menu navigation, a contact QR, and
# the menu returning for a second action.

Output demo.gif
Require node

Set Shell "zsh"
Set FontSize 14
Set Width 1000
Set Height 1000
Set Padding 20
Set Theme "GitHub Dark"
Set TypingSpeed 55ms
Set WaitTimeout 30s

# Pre-warm the npx cache off-camera so the real run doesn't show an install prompt.
Hide
Type "npx --yes brignano --no-prompt >/dev/null 2>&1"
Enter
Sleep 15s
Type "clear"
Enter
Show

# The real thing — exactly what anyone runs.
Type "npx brignano"
Sleep 400ms
Enter

# Wait for the interactive menu to actually be on screen (and inquirer to be in
# raw mode) before sending any keys — otherwise arrow keys echo as ^[[B. This is
# robust against npx/animation/live-fetch startup latency.
Wait+Screen /What would you like to do/
Sleep 1s

# Walk down the menu to showcase the actions.
Down
Sleep 600ms
Down
Sleep 600ms
Down
Sleep 600ms
Down
Sleep 600ms
Down
Sleep 600ms
Down
Sleep 800ms

# Land on "Show a contact QR code" and select it.
Enter
Sleep 3s

# The menu comes back after every action — finish by choosing Quit.
Wait+Screen /Anything else/
Sleep 800ms
Up
Sleep 800ms
Enter
Sleep 2s
