import { serve, } from "bun";
import path from "path";
import os from "os";
import { marked } from "marked";
import type { Tagged } from 'type-fest';
import { renderToReadableStream } from "react-dom/server";
import { compile, optimize } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'

import { Layout } from './components/+Layout';

type Asset = Tagged<{
  path: string;      // Path to the asset file on the server
  mimeType: string;  // MIME type of the asset (e.g., "image/png", "text/css")
  size?: number;     // Optional size of the asset in bytes
  lastModified?: Date; // Optional last modified date
  data?: Bun.BunFile; // Optional data for in-memory processing
}, 'Asset'>;

async function createAsset(filePath: string): Promise<Asset> {
  const file = Bun.file(filePath);

  // Get the stats of the file to extract size and last modified time
  const stats = await file.stat();

  return {
    path: filePath,
    mimeType: file.type, // Automatically inferred mime type
    size: stats.size,
    lastModified: new Date(stats.mtimeMs),
    data: file
  } as Asset;
}


// parse wikilinks
marked.use({
  extensions: [{
    name: 'wikilink',
    level: 'inline', // Can be 'block' or 'inline'
    start(src) {
      return src.indexOf('[[');
    },
    renderer(token) {
      return `<a href="${token['href']}">${token['text']}</a>`;
    },
    tokenizer(src) {
      const match = /^\[\[([^|\]#]+)(?:#[^\]]*)?(?:\|([^\]]+))?\]\]/gm.exec(src);
      if (match) {
        const href = match[1]?.trim()
        const text = (match[2] ?? match[1])?.trim()
        const token = {
          type: 'wikilink',
          raw: match[0],
          href,
          text,
          tokens: [],
        }
        return token
      }
      return undefined
    },
  }]
});

async function serveHTML(content: string, status: number) {
  const x = (<Layout>
    {content}
  </Layout>)
  const stream = await renderToReadableStream(
      x
    );
  return new Response(stream, {
    status: status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': String(content.length),
    },
  });
}

function serveAsset(asset: Asset, status: number) {

  const headers = new Headers();

  headers.set("Content-Type", asset.mimeType);

  if (asset.size !== undefined) {
    headers.set("Content-Length", asset.size.toString());
  }

  if (asset.lastModified) {
    headers.set("Last-Modified", asset.lastModified.toUTCString());
  }

  headers.set("Cache-Control", "max-age=3600"); // Example cache control, adjust as needed
  headers.set("Content-Disposition", `inline; filename="${asset.path.split('/').pop()}"`);

  return new Response(asset.data, {
    status: status,
    headers,
  });
}

function resolvePath(dir: string, urlPath: string) {

  // Remove `..` to prevent directory traversal
  const sanitizedPath = urlPath.replace(/\.\./g, '');

  // Default to "readme.md" if root path is requested
  let potentialPath = sanitizedPath === '/' ? 'readme.md' : sanitizedPath;

  // Join with the base directory
  let fullPath = path.join(dir, potentialPath);

  return fullPath;
}

function documentHandler(dir: string) {
  return async (req: Request) => {
    const path = new URL(req.url).pathname;
    let realpath = resolvePath(dir, path);
    if (!realpath.endsWith(".md")) {
      realpath = `${realpath}.md`;
    }
    try {
      const content = Bun.file(realpath)
      const document = await content.text()
      const htmlContent = await marked(document); // Convert markdown to HTML
      return serveHTML(htmlContent, 200);
    } catch (err) {
      return undefined
    }

  };
}

function assetHandler(dir: string) {
  return async (req: Request) => {
    const path = new URL(req.url).pathname;
    let realpath = resolvePath(dir, path);
    try {
      const asset = await createAsset(realpath)
      return serveAsset(asset, 200)
    } catch (err) {
      return undefined
    }
  };
}

function lookup(dir: string) {
  const lookupAsset = assetHandler(dir)
  const lookupDocument = documentHandler(dir)
  const handlers = [lookupDocument, lookupAsset]
  return async (req: Request) => {
    for (let i = 0; i < handlers.length; i++) {
      const handler = handlers[i]
      if (handler) {
        const resp = await handler(req)
        if (resp) {
          return resp
        }
      }
    }
    return new Response("Not Found", { status: 404 });
  }
}

const contentDir = path.resolve(os.homedir(), 'Dropbox/memex')

// https://github.com/tailwindlabs/tailwindcss/blob/main/packages/%40tailwindcss-cli/src/commands/build/index.ts
async function tailwindcss() {
  const style = Bun.file("./src/index.css")
  const text = await style.text()
  const base = path.resolve(__dirname, "./components")
  const compiler = await compile(text, {
    base,
    onDependency: () => {}
  })

  const sources = [{ base, pattern: '**/*', negated: false }, {  base: contentDir, pattern: '**/*', negated: false }]
  const scanner = new Scanner({ sources })
  const candidates = scanner.scan()

  const css = compiler.build(candidates)

  let optimizedCss = optimize(css, {
    minify: true,
  })

  return optimizedCss

}

const PORT = 8080

serve({
  routes: {
    "/index.css": new Response(await tailwindcss())
  },
  fetch: lookup(contentDir),
  port: PORT
});

console.log(`Server running on http://localhost:${PORT}`);

/**
 * Features:
 * - git based
 * - sqlite tracking
 * - 
 */

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
