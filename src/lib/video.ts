/**
 * Recognises a video link and tells how to play it inside the portal: a video file (played
 * with <video>) or a page of a video service (played in its embed player).
 */

export type VideoSource =
  | { kind: "file"; src: string }
  | { kind: "embed"; src: string; provider: string };

const FILE_EXT = /\.(mp4|webm|ogv|ogg|mov|m4v)$/i;

/** github.com/o/r/blob/<ref>/<path> -> github.com/o/r/raw/<ref>/<path>: GitHub redirects it to
 *  the file itself, also when it is stored with Git LFS. */
function githubRaw(u: URL): string | null {
  if (u.hostname !== "github.com") return null;
  const parts = u.pathname.split("/");
  if (parts.length > 4 && parts[3] === "blob") {
    parts[3] = "raw";
    return `https://github.com${parts.join("/")}`;
  }
  return null;
}

export function videoSource(raw: string): VideoSource | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  // video services: their own player in an iframe
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    const id =
      host === "youtu.be"
        ? u.pathname.slice(1)
        : u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
    return id ? { kind: "embed", provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === "vimeo.com") {
    const id = u.pathname.match(/^\/(\d+)/)?.[1];
    return id ? { kind: "embed", provider: "Vimeo", src: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (host === "loom.com") {
    const id = u.pathname.match(/^\/share\/([^/]+)/)?.[1];
    return id ? { kind: "embed", provider: "Loom", src: `https://www.loom.com/embed/${id}` } : null;
  }
  if (host === "drive.google.com") {
    const id = u.pathname.match(/^\/file\/d\/([^/]+)/)?.[1];
    return id ? { kind: "embed", provider: "Google Drive", src: `https://drive.google.com/file/d/${id}/preview` } : null;
  }

  // GitHub: files attached to issues and PRs, and files in a repository
  if (host === "github.com" && u.pathname.startsWith("/user-attachments/assets/")) {
    return { kind: "file", src: u.toString() };
  }
  if (!FILE_EXT.test(u.pathname)) return null;
  return { kind: "file", src: githubRaw(u) ?? u.toString() };
}
