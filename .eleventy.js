const path = require("path");
const { shouldHideInProduction } = require("./lib/post-visibility");
const { isSupersededDuplicate, prepareN8nPosts } = require("./lib/n8n-posts");

const SITE_URL = "https://philippineleads.com";

// The article workflow can publish the same title more than once; keep the newest post per slug
const duplicateGroups = prepareN8nPosts(path.join(__dirname, "content", "posts"));
if (duplicateGroups.length > 0) {
  console.log(`[n8n] Resolved ${duplicateGroups.length} duplicate slug group(s); keeping the newest post for each slug.`);
}

// The hand-built pages are plain HTML and are copied as they are; only the blog is templated
const STATIC_PATHS = [
  "index.html",
  "404.html",
  "robots.txt",
  "llms.txt",
  "assets",
  "about",
  "booked",
  "clients-reviews",
  "contact",
  "guides",
  "industries",
  "privacy-policy",
  "resources",
  "services",
  "thank-you",
  "videos",
  "webinars",
  "admin",
];

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

module.exports = function (eleventyConfig) {
  for (const p of STATIC_PATHS) eleventyConfig.addPassthroughCopy(p);
  eleventyConfig.addPassthroughCopy({ "content/media": "media" });

  eleventyConfig.addFilter("rangeFromOne", (end) => {
    const n = Math.max(1, Math.floor(Number(end)));
    return Array.from({ length: n }, (_, i) => i + 1);
  });

  eleventyConfig.addFilter("blogPageCount", (postCount, pageSize) => {
    const count = Number(postCount);
    const size = Number(pageSize) || 12;
    return Math.max(1, Math.ceil(count / size));
  });

  eleventyConfig.addFilter("atomDate", (value) => (toDate(value) || new Date(0)).toISOString());

  eleventyConfig.addFilter("isoDate", (value) => {
    const date = toDate(value);
    return date ? date.toISOString().slice(0, 10) : "";
  });

  eleventyConfig.addFilter("postDate", (value) => {
    const date = toDate(value);
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      year: "numeric",
      month: "long",
      timeZone: "Asia/Manila",
    });
  });

  eleventyConfig.addFilter("relatedPosts", (posts = [], url, count = 3) =>
    posts.filter((post) => post.url !== url).slice(0, count)
  );

  // JSON-LD for blog pages: the site's organization, breadcrumbs, and a BlogPosting on articles
  eleventyConfig.addFilter("blogSchema", (page, title, description, image, date, isBlogPost) => {
    const org = {
      "@type": "ProfessionalService",
      "@id": `${SITE_URL}/#org`,
      name: "PhilippineLeads.com",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/assets/icon-512.png`,
      image: `${SITE_URL}/assets/og-image.png`,
      telephone: "+63 916 750 2657",
      email: "info@PhilippineLeads.com",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Taguig",
        addressRegion: "Metro Manila",
        addressCountry: "PH",
      },
      areaServed: { "@type": "Country", name: "Philippines" },
    };
    const crumbs = [
      { name: "Home", item: `${SITE_URL}/` },
      { name: "Resources", item: `${SITE_URL}/resources/` },
      { name: "Blog", item: `${SITE_URL}/blog/` },
    ];
    const graph = [org];

    if (isBlogPost) {
      const url = `${SITE_URL}${page.url}`;
      const published = toDate(date);
      crumbs.push({ name: title, item: url });
      graph.push({
        "@type": "BlogPosting",
        headline: title,
        description,
        url,
        mainEntityOfPage: url,
        image: `${SITE_URL}${image || "/assets/og-image.png"}`,
        ...(published ? { datePublished: published.toISOString(), dateModified: published.toISOString() } : {}),
        author: { "@id": `${SITE_URL}/#org` },
        publisher: { "@id": `${SITE_URL}/#org` },
        inLanguage: "en-PH",
      });
    }

    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, ...c })),
    });

    // Escape "<" so an article title can never close the script tag
    return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
  });

  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi
      .getFilteredByGlob("content/posts/*.md")
      .filter(
        (post) =>
          !isSupersededDuplicate(post.inputPath) &&
          !shouldHideInProduction({
            date: post.date,
            draft: post.data?.draft,
          })
      )
      .sort((a, b) => b.date - a.date)
  );

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
    // Generated articles are plain markdown/HTML; don't let a stray "{{" in one break the build
    markdownTemplateEngine: false,
    templateFormats: ["md", "njk"],
  };
};
