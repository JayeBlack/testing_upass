import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://smart-postgrad-hub.lovable.app";

interface SEOProps {
  title: string;
  description: string;
}

/**
 * Per-route SEO tags. Sets a unique <title>, <meta description>, and
 * self-referencing <link rel="canonical"> for the active route.
 */
const SEO = ({ title, description }: SEOProps) => {
  const { pathname } = useLocation();
  const url = `${SITE_URL}${pathname}`;
  const desc = description.length > 160 ? description.slice(0, 157) + "..." : description;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
    </Helmet>
  );
};

export default SEO;