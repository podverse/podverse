An authenticator app is now the second factor at sign-in. You turn it on by confirming a code from the app. Email is not a way to turn it on. After the app is set up, a rate-limited email code or a one-time backup code can finish sign-in if the phone is unavailable.

This stays optional unless a deployment sets it to required. An account that has not set it up still signs in with a password. If a deployment later requires it, the next sign-in walks through setup after the password and does not start a session until that finishes.

Listener accounts and management admins are separate. Each side has its own switch.
