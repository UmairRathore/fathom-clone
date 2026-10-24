# Validation and errors
|Owner|Trigger|Exact visible feedback|Behavior|
|---|---|---|---|
|Fathom SSO|empty Log In|Please enter a valid email address|Redborder/inline,error,sameroute|
|Fathom SSO|not-an-email then Log In|Please enter a valid email address|Same|
|Microsoft|empty Next|Enter a valid email address, phone number, or Skype name.|Redmessage/underline|
|Google|empty Next|Enter an email or phone number|Pink/redoutline/icon/inline|
|Fathom|Logout then /home|Sign in to Fathom|Redirectlogin,noexpirybanner|

Provider buttons enabled at rest. Fathom provider pages have no passwordfields. Transient emptyDOM during navigation was not reliable visual loading evidence. Wrongpassword, MFA, verificationemail, OAuthdenial, timedexpiry, SSOtenantlookup, recoverycompletion unverified. Recoveryentries directly seen: Google Forgot email?; Microsoft Can't access your account? No reset requested.

Sounding additions require independent tests: invalidcredentials, verifiedsignup, genericresetconfirmation, tokenexpiry/reuse, logout/expiry, CSRF, ownerreads/writes, isolateddemos, cookie-freeshares. Never log requestbodies, resetURLs, cookies or providertokens.
