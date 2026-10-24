# Authentication design specification

Measurements use read-only rendered DOM bounding boxes/computed CSS and actual screenshots at 1142×1532 desktop and 390×844 mobile. Scaling, scrollbars and font loading affect decimal coordinates.

## Provider pages

Sora sans-serif. Heading 30px/36px, weight700, near-white rgb(250,245,245). Buttons 288×56px, white background, black 16px text at weight 500, 8px radius, approximately1px pale border and 16px vertical gaps. Route links 14px, cyan rgb(0,190,255), underlined. Policy footer 12px, white at 40% opacity. Black canvas; card approximately #111, subtle gray border, 24px radius and little shadow. Centered brand near y44.

Desktop signup card approximately x100–563,y489–1002. Headingx186,y589,width290,height36; Googlex187,y725; Microsofty797; sign-in linky893; policyy953. Login card approximately x100–563,y508–982; headingy570; provider buttonsy633,705,777. Right testimonial aroundx619,y674; trust strip near the bottom.

## Responsive behavior

Mobile cardx16–359. Login approximately y157–646; signupy157–705. Buttons remain 288×56; screenshotx44, a later DOM measurementx51 after layout/scrollbar settling. Heading remains 30px. Brand nearx100,y44. Testimonial stacks below the card; subtitles and policies wrap. Document scroll width390: no horizontal overflow. Full composition requires vertical scrolling.

## SSO fields and error style

SSO has a separate split layout: promotion beside a#1c1c20 form pane. Multiline 30px heading, 14px label, dark 56px-high input, cyan 56px primary button, centered Back to Login. The promotion image loaded after the initial capture and changed its layout. Mobile promotion sits above the form; empty submission scrolls the input into view. Invalid input has a red border and small red inline error. No reliable submit spinner or disabled state was captured.

Sounding uses the composition and hierarchy with independent branding and honest educational copy, without copying endorsements. Google OAuth redirects to Google's actual interface; do not recreate provider credential collection. Microsoft/SSO remain reference observations, not requested Sounding integrations.
