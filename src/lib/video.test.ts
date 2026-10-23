import { describe, expect, it } from "vitest";
import { videoSource } from "./video";

describe("videoSource", () => {
  it("plays files of a GitHub repository through the raw link", () => {
    expect(videoSource("https://github.com/pagopa/qa-hub/blob/main/docs/demo.mp4")).toEqual({
      kind: "file",
      src: "https://github.com/pagopa/qa-hub/raw/main/docs/demo.mp4",
    });
    expect(videoSource("https://raw.githubusercontent.com/pagopa/x/main/a.webm")).toEqual({
      kind: "file",
      src: "https://raw.githubusercontent.com/pagopa/x/main/a.webm",
    });
  });

  it("plays videos attached to GitHub issues and pull requests", () => {
    const url = "https://github.com/user-attachments/assets/0f1e2d3c-aaaa-bbbb-cccc-1234567890ab";
    expect(videoSource(url)).toEqual({ kind: "file", src: url });
  });

  it("uses the embed player of video services", () => {
    expect(videoSource("https://www.youtube.com/watch?v=abc123&t=10")).toMatchObject({
      kind: "embed",
      src: "https://www.youtube-nocookie.com/embed/abc123",
    });
    expect(videoSource("https://youtu.be/abc123")?.src).toBe("https://www.youtube-nocookie.com/embed/abc123");
    expect(videoSource("https://vimeo.com/123456")?.src).toBe("https://player.vimeo.com/video/123456");
    expect(videoSource("https://www.loom.com/share/f00")?.src).toBe("https://www.loom.com/embed/f00");
    expect(videoSource("https://drive.google.com/file/d/XYZ/view?usp=sharing")?.src).toBe(
      "https://drive.google.com/file/d/XYZ/preview",
    );
  });

  it("ignores everything else", () => {
    expect(videoSource("https://pagopa.atlassian.net/wiki/spaces/X")).toBeNull();
    expect(videoSource("https://github.com/pagopa/x/blob/main/README.md")).toBeNull();
    expect(videoSource("not a url")).toBeNull();
  });
});
