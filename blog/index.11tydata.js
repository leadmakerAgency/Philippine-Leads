module.exports = {
  layout: "base.njk",
  title: "Philippine Business Blog",
  eleventyExcludeFromCollections: true,
  pagination: {
    data: "collections.posts",
    size: 12,
    alias: "pagedPosts",
    before: (paginationData) =>
      paginationData && paginationData.length > 0 ? paginationData : [null],
  },
  eleventyComputed: {
    metaTitle: (data) => {
      const n = data.pagination?.pageNumber ?? 0;
      return `Philippine Business Blog | Lead Generation & Marketing Tips${n > 0 ? ` - Page ${n + 1}` : ""}`;
    },
    metaDescription: () =>
      "Practical marketing, sales and lead generation strategies for Philippine businesses. Learn how to get more customers, appointments and sales.",
  },
  permalink(data) {
    const pageNumber = data.pagination?.pageNumber ?? 0;
    return pageNumber === 0 ? "/blog/" : `/blog/page/${pageNumber + 1}/`;
  },
};
