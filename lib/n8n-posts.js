const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const MEDIA_DIR = path.join(ROOT_DIR, "content", "media");

let supersededInputPaths = new Set();
let mediaByExecutionId = null;

const normalizeSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const getExecutionId = (fileSlug = "") => {
  const match = String(fileSlug).match(/-(\d{5,})$/);
  return match ? match[1] : null;
};

const parseDateValue = (value) => {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const fileExists = (webPath = "") => {
  if (!webPath) return false;
  return fs.existsSync(path.join(ROOT_DIR, webPath.replace(/^\//, "")));
};

// Eleventy passes "./content/posts/x.md" while the disk index holds absolute paths,
// so resolve both against the project root before comparing
const normalizeInputPath = (inputPath = "") =>
  path.resolve(ROOT_DIR, String(inputPath)).toLowerCase();

const getMediaIndex = () => {
  if (mediaByExecutionId) return mediaByExecutionId;

  mediaByExecutionId = new Map();
  if (!fs.existsSync(MEDIA_DIR)) return mediaByExecutionId;

  for (const file of fs.readdirSync(MEDIA_DIR)) {
    const match = file.match(/-(\d{5,})\.(png|jpe?g|webp)$/i);
    if (!match) continue;

    const executionId = match[1];
    if (!mediaByExecutionId.has(executionId)) {
      mediaByExecutionId.set(executionId, `/media/${file}`);
    }
  }

  return mediaByExecutionId;
};

const resetBuildState = () => {
  supersededInputPaths = new Set();
  mediaByExecutionId = null;
};

const readPostMetaFromFile = (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const slugMatch = content.match(/^slug:\s*["']?([^"'\n]+)["']?/m);
  const dateMatch = content.match(/^date:\s*["']?([^"'\n]+)["']?/m);
  const fileName = path.basename(filePath, ".md");

  return {
    inputPath: filePath,
    fileSlug: fileName,
    slug: normalizeSlug(slugMatch ? slugMatch[1] : fileName),
    date: dateMatch ? dateMatch[1].trim() : "",
  };
};

const indexPostsFromDisk = (postsDir) => {
  if (!fs.existsSync(postsDir)) return [];

  return fs
    .readdirSync(postsDir)
    .filter((file) => file.endsWith(".md") && !file.includes("11tydata"))
    .map((file) => readPostMetaFromFile(path.join(postsDir, file)));
};

const prepareN8nPosts = (postsDir) => {
  resetBuildState();

  const posts = indexPostsFromDisk(postsDir);
  const groupedBySlug = new Map();

  for (const post of posts) {
    if (!groupedBySlug.has(post.slug)) groupedBySlug.set(post.slug, []);
    groupedBySlug.get(post.slug).push(post);
  }

  const duplicateGroups = [];

  for (const [slug, group] of groupedBySlug) {
    if (group.length <= 1) continue;

    const sorted = [...group].sort((a, b) => {
      const dateDiff = parseDateValue(b.date) - parseDateValue(a.date);
      if (dateDiff !== 0) return dateDiff;

      const aHasExecutionId = Boolean(getExecutionId(a.fileSlug));
      const bHasExecutionId = Boolean(getExecutionId(b.fileSlug));
      return Number(bHasExecutionId) - Number(aHasExecutionId);
    });

    duplicateGroups.push({ slug, posts: sorted });

    for (let index = 1; index < sorted.length; index += 1) {
      supersededInputPaths.add(normalizeInputPath(sorted[index].inputPath));
    }
  }

  getMediaIndex();

  return duplicateGroups;
};

const isSupersededDuplicate = (inputPath = "") =>
  supersededInputPaths.has(normalizeInputPath(inputPath));

const resolveFeaturedImage = (data) => {
  const frontmatterImage = data.featured_image || "";
  const fileSlug = data.page?.fileSlug || "";
  const slug = normalizeSlug(data.slug || fileSlug);
  const executionId = getExecutionId(fileSlug);

  if (fileExists(frontmatterImage)) {
    return frontmatterImage;
  }

  if (executionId) {
    const imageFromExecution = getMediaIndex().get(executionId);
    if (imageFromExecution) return imageFromExecution;
  }

  const slugImage = `/media/image-${slug}.png`;
  if (fileExists(slugImage)) {
    return slugImage;
  }

  return frontmatterImage;
};

module.exports = {
  normalizeSlug,
  getExecutionId,
  prepareN8nPosts,
  isSupersededDuplicate,
  resolveFeaturedImage,
  resetBuildState,
};
