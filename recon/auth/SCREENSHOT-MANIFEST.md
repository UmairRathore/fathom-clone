# Screenshot manifest
Observed 2026-10-24 UTC. Actual screenshots reviewed before saving under screenshots/; all ignored by Git. Desktop 1142×1532; mobile 390×844. Crops exclude account identifiers. No credential, token, inbox or recovery link saved.

|File|Route/state|Capture|Behavior|
|---|---|---|---|
|01-account-menu-controls-crop.jpg|/home menu|225×320 at912,52|Logout; account footer excluded, left labels partly clipped|
|02-signin-after-logout-desktop.jpg|/users/sign_in|desktop fullpage|Logout redirects here|
|03-signup-provider-selection-desktop.jpg|/users/sign_up|desktop fullpage|Two providers, login link|
|04-sso-email-desktop.jpg|/users/sign_in/sso|desktop fullpage|Email, Log In, Back to Login|
|05-sso-empty-validation-desktop.jpg|same empty submit|desktop fullpage|Red inline validation|
|06-sso-malformed-validation-desktop.jpg|same not-an-email|desktop fullpage|Same validation|
|07-microsoft-signin-entry.jpg|login.microsoftonline.com/common/oauth2/v2.0/authorize|desktop fullpage|Blank identifier, recovery entry|
|08-microsoft-empty-validation.jpg|same empty Next|desktop fullpage|Provider error|
|09-google-account-chooser-heading-crop.jpg|accounts.google.com/v3/signin/accountchooser|520×155 at310,540|Choose an account; account rows excluded|
|10-google-identifier-entry.jpg|accounts.google.com/v3/signin/identifier|desktop fullpage|Blank Email or phone; Forgot email?|
|11-google-empty-validation.jpg|same empty Next|desktop fullpage|Inline provider error|
|12-returning-user-home-header-crop.jpg|/home after Google login|800×106 at0,0|Successful login; meeting/account data excluded|
|13-mobile-signin-viewport.jpg|/users/sign_in|390×844|Card stacks before testimonial|
| 14-mobile-signin-full-page-request.jpg | /users/sign_in | full-page capture requested; API returned viewport | Not proof of content below the viewport |
|15-mobile-signup-viewport.jpg|/users/sign_up|390×844|Wrapped subtitle, two providers|
|16-mobile-sso-validation.jpg|/users/sign_in/sso|390×844 scrolled|Promotion above form; inline error|
|17-landing-auth-entry-crop.jpg|www.fathom.ai/|1110×730 at0,0|Log In, SIGN UP FREE, GET STARTED - FREE FOREVER|

OAuth query strings deliberately omitted. Successful login, logout twice, signup/login links, Back to Login and unauthenticated redirect exercised. No fabricated evidence for unavailable states.
