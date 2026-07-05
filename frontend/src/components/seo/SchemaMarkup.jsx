import { useEffect } from 'react';

const SchemaMarkup = ({ schema }) => {
  useEffect(() => {
    // Create script element for schema
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    script.id = `schema-${schema['@type']?.toLowerCase() || 'generic'}`;
    
    // Remove existing schema of same type
    const existingScript = document.getElementById(script.id);
    if (existingScript) {
      existingScript.remove();
    }
    
    document.head.appendChild(script);
    
    return () => {
      const scriptToRemove = document.getElementById(script.id);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [schema]);
  
  return null;
};

// Organization Schema for construction company
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "ConstructionCompany",
  "name": "Decorous",
  "description": "Leading construction company in Odisha offering residential, commercial, interior design, warehouse, and PEB construction services.",
  "url": "https://decorous.in",
  "logo": "https://decorous.in/logo.png",
  "telephone": "+917008863329",
  "email": "contact@decorous.in",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Bhubaneswar",
    "addressRegion": "Odisha",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "20.2961",
    "longitude": "85.8245"
  },
  "areaServed": [
    {"@type": "City", "name": "Bhubaneswar"},
    {"@type": "City", "name": "Cuttack"},
    {"@type": "City", "name": "Puri"},
    {"@type": "City", "name": "Khordha"},
    {"@type": "City", "name": "Rourkela"},
    {"@type": "City", "name": "Berhampur"},
    {"@type": "City", "name": "Sambalpur"}
  ],
  "serviceType": [
    "Residential Construction",
    "Commercial Construction", 
    "Interior Design",
    "Warehouse Construction",
    "Pre-Engineered Buildings"
  ],
  "priceRange": "₹₹₹",
  "openingHours": "Mo-Sa 09:00-19:00",
  "sameAs": [
    "https://www.facebook.com/decorous",
    "https://www.instagram.com/decorous",
    "https://www.linkedin.com/company/decorous"
  ]
};

// Local Business Schema
export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://decorous.in/#business",
  "name": "Decorous - Construction Company Bhubaneswar",
  "image": "https://decorous.in/logo.png",
  "telephone": "+917008863329",
  "email": "contact@decorous.in",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Bhubaneswar",
    "addressLocality": "Bhubaneswar",
    "addressRegion": "Odisha",
    "postalCode": "751001",
    "addressCountry": "IN"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "150"
  }
};

// FAQ Schema generator
export const generateFAQSchema = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

// Service Schema generator
export const generateServiceSchema = (service) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "name": service.name,
  "description": service.short_description,
  "provider": {
    "@type": "ConstructionCompany",
    "name": "Decorous"
  },
  "areaServed": {
    "@type": "State",
    "name": "Odisha"
  }
});

// Blog Article Schema generator
export const generateArticleSchema = (post) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": post.title,
  "description": post.excerpt,
  "image": post.image,
  "author": {
    "@type": "Organization",
    "name": "Decorous"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Decorous",
    "logo": {
      "@type": "ImageObject",
      "url": "https://decorous.in/logo.png"
    }
  },
  "datePublished": post.created_at,
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": `https://decorous.in/blog/${post.slug}`
  }
});

export default SchemaMarkup;
