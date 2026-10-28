const { shouldHideInProduction } = require("../../lib/post-visibility");
const { isSupersededDuplicate, resolveFeaturedImage } = require("../../lib/n8n-posts");

module.exports = {
  isBlogPost: true,
  eleventyComputed: {
    layout: (data) => data.layout || "blog-post.njk",
    featured_image: (data) => resolveFeaturedImage(data),
    metaTitle: (data) => `${data.title} | PhilippineLeads.com Blog`,
    metaDescription: (data) => data.excerpt || data.title,
    eleventyExcludeFromCollections: (data) => {
      if (isSupersededDuplicate(data.page?.inputPath)) {
        return true;
      }

      if (shouldHideInProduction(data)) {
        return true;
      }

      return data.eleventyExcludeFromCollections;
    },
    permalink: (data) => {
      if (isSupersededDuplicate(data.page?.inputPath)) {
        return false;
      }

      if (shouldHideInProduction(data)) {
        return false;
      }

      const rawSlug = data.slug || data.page?.fileSlug || "";
      const normalizedSlug = String(rawSlug)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      return `/blog/${normalizedSlug || data.page.fileSlug}/`;
    },
  },
};
