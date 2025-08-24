import React from "react";
import { useEffect } from "react";

interface SeoProps {
  title: string;
  description?: string;
}

const Seo: React.FC<SeoProps> = ({ title, description }) => {
  useEffect(() => {
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", description || "");

    const canonicalId = "canonical-link";
    let link = document.querySelector(`#${canonicalId}`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      link.id = canonicalId;
      document.head.appendChild(link);
    }
    link.href = window.location.href;
  }, [title, description]);

  return null;
};

export default Seo;
