# Google Play checkout on a USB phone

Buy Premium on a phone plugged into the Mac, against the local API, with a Play
test card. Console credentials, the subscription product, and the service
account stay in
[BILLING-GOOGLE-PLAY-SANDBOX.md](BILLING-GOOGLE-PLAY-SANDBOX.md). This page is
the account, the phone, and the purchase.

The Google account that pays and the Podverse account that receives membership
are two different logins. Play never sees the Podverse password, and Podverse
does not store the Google password.

## Before the phone

Finish the sandbox guide through **Seed processor products**, then leave these
running:

| Tab        | Command                                  |
| ---------- | ---------------------------------------- |
| **Dev**    | `npm run dev:all:watch` (API on `:3000`) |
| **Docker** | Postgres from `make local_infra_up`      |

`BILLING_GOOGLE_PLAY_ENABLED="true"` must already be loaded by that API
process. Restart **Dev** after `make local_env_setup` when you turn the flag
on. Real-time developer notifications can wait: the app posts the purchase
token, and the API verifies it with the Play Developer API.

Stop **Mobile Metro** if it is running `npm run mobile:dev`. That command
points Android at `10.0.2.2`, which only an emulator can use. A phone needs
`npm run mobile:dev:device` later in this page. Only one Metro can listen on
`:8081`.

## Create the Google account

Use a Gmail address you can sign into on the phone. A dedicated address keeps
test orders out of a personal Play library. The Play Console owner account can
be the tester when you want one less account.

On the Mac:

1. Open [https://accounts.google.com/signup](https://accounts.google.com/signup).
2. Choose **For my personal use**.
3. Enter a name. Google also asks for a birthday.
4. Create a Gmail address and a password, and keep the password somewhere you
   control.
5. Finish verification. Google often asks for a phone number before the
   account exists. That number is Google's check, and it can be a number you
   already use.

You should land in the new account and see the Gmail address. That address is
what you add in Play Console.

## Add the account as a license tester

License testers are a list on the Play Console **account**, shared by every
app in that console.

1. Open [Play Console](https://play.google.com/console).
2. Go to **Settings** → **License testing**.
3. Add the Gmail address from the previous section and save.

A license tester pays with a Play test card. Play does not charge that card.
The payment sheet offers **Test card, always approves** and **Test card,
always declines**. The declined card is how you exercise a failed charge.
The list can take from a few minutes up to a couple of hours to apply. Until
it does, the sheet shows ordinary cards.

## Opt the account into internal testing

License testing and the internal-testing email list are separate. The app
`com.podverse.app.next` also needs one uploaded release on the internal track,
and this Gmail address has to join that test. Upload and base-plan rules are
in the sandbox guide under **App on a testing track**.

1. In Play Console, open the app, then **Test and release** → **Testing** →
   **Internal testing**.
2. On **Testers**, create an email list or open the existing one, add the same
   Gmail address, and save.
3. Copy the opt-in link on that page (**Copy link**).
4. On the phone, after the Play Store is signed into that Gmail address (next
   section), open the link in Chrome and accept **Become a tester**.

Play answers "item not available" when the installed package, signing
certificate, or `versionCode` does not match a build on that track. A local
`mobile:android:device` install is signed with the Mac debug keystore
(`~/.android/debug.keystore`). Play Billing accepts that signature when the
debug certificate is the one registered for the app. Otherwise install a build
signed with the upload key Play already has, or register this debug
certificate on the app before buying.

## Sign the tester into the phone

The Play Store account with the checkmark is the one that buys. An extra
Google account sitting on the phone does not count until you select it.

1. On the phone, open the Play Store.
2. Tap the profile photo at the top.
3. If the tester Gmail is missing, choose **Add another account** and sign in
   with that address and password.
4. Tap the profile photo again and select the tester Gmail so it shows the
   checkmark.
5. Open the internal-testing opt-in link from the previous section in Chrome
   while this account is selected, and accept **Become a tester**.

## Plug the phone in

1. On the phone, open **Settings** → **About phone** and tap **Build number**
   seven times until developer mode is on.
2. Open **Settings** → **System** → **Developer options** and turn on **USB
   debugging**.
3. Connect the USB-C cable. If the phone asks how to use USB, choose **File
   transfer**.
4. Accept **Allow USB debugging** and check **Always allow from this
   computer**.
5. Join the phone to the **same Wi-Fi** as the Mac. The cable installs the
   app. Metro and the API are reached over Wi-Fi.

In **Root**, confirm the phone is authorized:

```bash
adb devices
```

A hardware serial in the `device` state is ready. `unauthorized` means the
phone prompt is still waiting. `offline` usually clears after a few seconds;
run the command again. Rows named `emulator-*` can stay. If `adb` is not on
`PATH`:

```bash
"$HOME/Library/Android/sdk/platform-tools/adb" devices
```

## Install the dev client

In **Mobile Metro**, leave this running:

```bash
npm run mobile:dev:device
```

It prints a LAN API URL such as `http://192.168.x.x:3000/api/v2` and does not
rewrite `apps/mobile/.env`. Allow incoming `node` connections if the Mac
firewall asks. The phone must reach ports `8081` and `3000` on that address.
When the script cannot find a LAN address:

```bash
MOBILE_API_LAN_HOST=192.168.x.x npm run mobile:dev:device
```

In **Mobile Android**, with Metro still up:

```bash
npm run mobile:android:device
```

The first install compiles the native app and can take several minutes. It
exits when the app has launched. Leave Metro running, and do not press `a` in
the Metro tab. Two phones at once need a serial:

```bash
MOBILE_ANDROID_DEVICE=<serial> npm run mobile:android:device
```

When the dev client opens, connect it to the LAN Metro URL from the Metro tab,
for example `http://192.168.x.x:8081`. Metro then prints `Android Bundled` and
Home appears.

## Buy Premium in the app

Sign into Podverse with a local seed account. Password for every seed account
is `Test!1Aa`. `local-premium@example.com` already has membership time, so the
screen can say the new period is added after the current one.

1. Open **More** → **Membership** → **Extend My Membership**.
2. Choose **Monthly** or **Annual**.
3. Tap **Complete Purchase**.
4. On the Play sheet, choose **Test card, always approves** and confirm.

Renewing base plans already in Play Console are unused and need no setup.

The membership screen shows a success message, and the local account's expiry
moves forward. In Play Console, **Order management** lists the tester's order.
**Test card, always declines** is the failed-charge path.

Ordinary saved cards on that sheet mean Play is still treating the account as
a normal buyer. Recheck **License testing**, the checkmark on the tester Gmail
in the Play Store, and wait for the license list to apply.

## Related

- [BILLING-GOOGLE-PLAY-SANDBOX.md](BILLING-GOOGLE-PLAY-SANDBOX.md)
- [BILLING.md](BILLING.md)
- [QUICKSTART](/docs/QUICKSTART.md)
