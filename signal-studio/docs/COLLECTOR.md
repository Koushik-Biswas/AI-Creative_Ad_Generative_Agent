# Authorized ad-collection adapter

Set `AD_LIBRARY_API_URL` to a trusted HTTPS service you operate or are authorized to use. Set `AD_LIBRARY_API_KEY` as a server secret if it requires bearer authentication. These settings are administrator-only; visitors cannot select an arbitrary collection endpoint.

Signal sends `POST` with:

```json
{
  "competitors": [{"id":"competitor-id","name":"Business name","url":"https://example.com","type":"direct","verified":false}],
  "platforms": ["google", "meta", "linkedin"],
  "region": "Global"
}
```

The service returns `{ "ads": [...] }`, with at most 100 entries per response:

```json
{
  "ads": [{
    "id":"stable-source-ad-id",
    "competitor":"Business name",
    "platform":"linkedin",
    "sourceUrl":"https://www.linkedin.com/ad-library/detail/EXACT_AD_ID",
    "headline":"Exact observed headline",
    "body":"Exact observed body copy",
    "cta":"Learn more",
    "visual":"Observed layout, colour, typography, imagery and logo placement",
    "started":"2026-10-01",
    "region":"India",
    "importedAt":"2026-10-25T12:00:00Z"
  }]
}
```

The example ID above is a placeholder, not evidence. Use real source URLs. Allowed hosts are `adstransparency.google.com`, `facebook.com`/`www.facebook.com` under `/ads/library`, and `linkedin.com`/`www.linkedin.com` under `/ad-library`. Platform and host must match. Signal validates provenance URLs but does not independently certify user-entered ad content.

Use only permitted public data and follow each library/provider's terms and regional coverage. Never claim an unavailable library contains no ads. Do not invent ads, active-ad counts, start dates, spend, clicks or conversion performance. Leave unknown dates/copy fields empty. Visual notes must reflect observations; image vision inference is a separate, currently unconnected capability.
