import { serve, } from "bun";
import path from "path";
import fs from "fs";
import os from "os";
import { marked } from "marked";

function serveHTML(content: string, status: number) {
  return new Response(content, {
    status: status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': String(content.length),
    },
  });
}

function resolvePath(dir: string, urlPath: string) {

  // Remove `..` to prevent directory traversal
  const sanitizedPath = urlPath.replace(/\.\./g, '');

  // Default to "readme.md" if root path is requested
  let potentialPath = sanitizedPath === '/' ? 'readme.md' : sanitizedPath;

  // Join with the base directory
  let fullPath = path.join(dir, potentialPath);


  if (!fullPath.endsWith(".md")) {
    return `${fullPath}.md`;
  }
  return fullPath;
}

function documentHandler(dir: string) {
  return async (req: Request) => {
    const path = new URL(req.url).pathname;
    const realpath = resolvePath(dir, path);
    let content;
    try {
      content = await fs.promises.readFile(realpath, "utf-8");
    } catch (err) {
      console.log(err);
      return new Response("Not Found", { status: 404 });
    }

    const htmlContent = await marked(content); // Convert markdown to HTML
    return serveHTML(htmlContent, 200);
  };
}



serve({ fetch: documentHandler(`${os.homedir()}/Dropbox/memex`), port: 8080 });

console.log(`Server running on http://localhost:8080`);


//- Error logging with a specified log file.
//- Command-line flag parsing for configurable options (address, template, etc.).
//- Template processing using variables within markdown.
//- TLS/SSL support for HTTPS.
//- Custom responder for different content types (e.g., text/plain).
//- Custom URL path resolution and trailing `.md` resolution logic.
//- Graceful shutdown on receiving OS signal.
//- HTML template wrapping around rendered markdown content.
//- Variable replacement within markdown files before rendering.
//- Wikilink rendering with a custom resolver.
//- Static file serving for assets.
//- Version and build information display.
