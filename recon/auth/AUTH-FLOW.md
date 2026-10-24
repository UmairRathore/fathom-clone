# Verified authentication journey
Routes: landing https://www.fathom.ai/; signup /users/sign_up; login /users/sign_in; SSO /users/sign_in/sso; home /home. Provider query strings never recorded.

```mermaid
stateDiagram-v2
 [*] --> Landing
 Landing --> Signup: SIGN UP FREE
 Landing --> Login: Log In
 Signup --> Login: Sign in
 Login --> Signup: Sign up
 Login --> SSO: Continue with SSO
 SSO --> SSOError: empty or malformed email
 SSOError --> Login: Back to Login
 SSO --> Login: Back to Login
 Login --> Microsoft: Continue with Microsoft
 Microsoft --> MicrosoftError: empty Next
 MicrosoftError --> Login: browser Back
 Login --> GoogleChooser: Continue with Google
 GoogleChooser --> GoogleIdentifier: Use another account
 GoogleIdentifier --> GoogleError: empty Next
 GoogleError --> GoogleChooser: browser Back
 GoogleChooser --> Home: existing authorized account
 Home --> Login: Logout
 UnauthenticatedHome --> Login: visit /home
```

Existing signed-in Google test account selection returned directly to Fathom /home without new credential/consent prompt. Logout tested twice. Explicit /home after logout redirected to /users/sign_in. This is unauthenticated behavior, not timed expiration evidence. Microsoft Back returned to Fathom login; Google Back returned to chooser. No separate Fathom Cancel control observed. Recovery belongs to providers as an inference from observed provider entry points; recovery completion and first-time onboarding unverified. No assumptions about Fathom backend architecture.
