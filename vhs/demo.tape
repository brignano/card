# Demo recording for `npx brignano`.
# Regenerate from the Actions tab ("Demo GIF" → "Run workflow"), or locally with
# `vhs vhs/demo.tape` if you have VHS installed.
# Renders the animated banner, the live card, menu navigation, a contact QR, and
# the menu returning for a second action.
#
# VHS only honours `Set` directives that come before any other command (an `Env`
# or `Type` ends the settings block), so keep every `Set` up here.

Output demo.gif
Require node

Set Shell "bash"
Set FontSize 14
Set Width 1000
Set Height 1000
Set Padding 20
Set Theme "GitHub Dark"
Set TypingSpeed 55ms
Set WaitTimeout 30s

# Advertise truecolor so the gradient isn't downsampled in the recording.
Env COLORTERM "truecolor"

# Off-camera setup. GitHub runners export CI=true, which (correctly) turns the
# card into its non-interactive mode — unset it so the recording shows the real
# experience. Then warm up (module cache, figlet font) so the real run starts
# crisply.
Hide
Type "unset CI"
Enter
Type "npx brignano --no-prompt >/dev/null 2>&1"
Enter
Sleep 3s
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

# The menu comes back right after the QR prints ("Anything else?") — finish by
# choosing Quit. `Up` from the top of the list wraps to it.
Sleep 1s
Up
Sleep 800ms
Enter
Sleep 2s
