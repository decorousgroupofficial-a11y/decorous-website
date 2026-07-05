/**
 * Per-route SEO meta tags via react-helmet-async.
 *
 * Usage:
 *   <Seo
 *     title="Residential Construction in Bhubaneswar | Decorous"
 *     description="Turnkey home construction in Bhubaneswar — BOQ-locked rates, 7–9 month delivery, engineer-led."
 *     path="/services/residential-construction"
 *     image="https://decorous.in/og-image.jpg"
 *     jsonLd={{ ... optional Schema.org JSON-LD object ... }}
 *   />
 */
import { Helmet } from "react-helmet-async";

const SITE = "https://decorous.in";
const DEFAULT_IMAGE = `${SITE}/og-image.jpg`;
const DEFAULT_TITLE = "Decorous | Best Construction Company in Bhubaneswar, Odisha";
const DEFAULT_DESC =
  "Decorous - Leading construction company in Bhubaneswar, Odisha. Residential, commercial, interior design, warehouse & PEB construction services. Get free estimate!";

export default function Seo({
  title,
  description,
  path = "",
  image,
  noindex = false,
  jsonLd,
  type = "website",
}) {
  const url = `${SITE}${path}`;
  const finalTitle = title || DEFAULT_TITLE;
  const finalDesc = description || DEFAULT_DESC;
  const finalImage = image || DEFAULT_IMAGE;

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDesc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:site_name" content="Decorous" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDesc} />
      <meta name="twitter:image" content={finalImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
