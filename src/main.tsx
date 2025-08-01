import { serve } from "bun";
import os from "os";
import path from "path";
import { marked } from "marked";
import type { Tagged } from 'type-fest';
import { renderToReadableStream } from "react-dom/server";
import { compile, optimize } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import type { ReactNode } from "react";
import { Page } from './components/Page';
import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    dir: {
      type: 'string',
      default: '~/Dropbox/memex'
    },
  },
  strict: true,
  allowPositionals: true,
});

function resolveTildePath(filePath: string) {
  if (!filePath || !filePath.startsWith('~')) {
    return filePath;
  }
  return path.join(os.homedir(), filePath.slice(1));
}

let contentDir: string | undefined = resolveTildePath(values.dir)

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

async function serveHTML({ content, data }: { content: ReactNode, data: any | undefined }, status: number) {
  const stream = await renderToReadableStream(
    content,
    {
      bootstrapScriptContent: `window.content = ${JSON.stringify(data)};`,
      bootstrapModules: ['/main.js']
    }
  );
  return new Response(stream, {
    status: status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
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

  // Default to "readme" if root path is requested
  let potentialPath = sanitizedPath === '/' ? 'readme' : sanitizedPath;

  // Join with the base directory
  let fullPath = path.join(dir, potentialPath);

  return fullPath;
}

function documentHandler(dir: string | undefined) {
  return async (req: Request) => {
    if (!dir) return undefined
    const path = new URL(req.url).pathname;
    let realpath = resolvePath(dir, path);
    if (!realpath.endsWith(".md")) {
      realpath = `${realpath}.md`;
    }
    try {
      const content = Bun.file(realpath)
      const document = await content.text()
      const htmlContent = await marked(document); // Convert markdown to HTML
      return serveHTML(
        {
          content: <Page content={ htmlContent } />,
          data: htmlContent
        }
        , 200);
    } catch (err) {
      return undefined
    }

  };
}

function parseCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.get('Cookie');

  const cookieHeaderList = cookieHeader?.split('; ').map(cookie => {
    const [name, ...value] = cookie.split('=');
    return [name, value.join('=')];
  })

  return Object.fromEntries(cookieHeaderList ?? []);
}

//function checkContentHandler() {
//  return async (req: Request) => {
//    const cookieContentDir = parseCookies(req)['contentDir'] ?? ""
//    const fullPath = resolveTildePath(atob(cookieContentDir))
//    contentDir = fullPath
//
//    if (!contentDir) {
//      return serveHTML(
//        { content: <Init />, data: undefined }
//        , 200);
//    }
//    return undefined
//  };
//}

function publicHandler(dir: string | undefined) {
  return async (req: Request) => {
    if (!dir) return undefined
    const urlPath = new URL(req.url).pathname;
    let realpath = resolvePath(path.resolve(__dirname, "../public"), urlPath);
    try {
      const asset = await createAsset(realpath)
      return serveAsset(asset, 200)
    } catch (err) {
      return undefined
    }
  };
}

function assetHandler(dir: string | undefined) {
  return async (req: Request) => {
    if (!dir) return undefined
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


function lookup() {
  const handlers = [publicHandler, assetHandler, documentHandler]
  return async (req: Request) => {
    for (let i = 0; i < handlers.length; i++) {
      const handler = handlers[i]?.(contentDir)
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


// https://github.com/tailwindlabs/tailwindcss/blob/main/packages/%40tailwindcss-cli/src/commands/build/index.ts
async function tailwindcss() {
  const style = Bun.file("./src/styles.css")
  const text = await style.text()
  const base = path.resolve(__dirname, "./")
  const compiler = await compile(text, {
    base,
    onDependency: () => { }
  })

  const sources = [{ base, pattern: '**/*', negated: false }]

  if (contentDir) {
    sources.push({ base: contentDir, pattern: '**/*', negated: false })
  }

  const scanner = new Scanner({ sources })
  const candidates = scanner.scan()

  const css = compiler.build(candidates)

  let optimizedCss = optimize(css, {
    minify: true,
  })

  return optimizedCss

}

function buildFrontend() {
  return async () => {
    const result = await Bun.build({
      entrypoints: [path.resolve(__dirname, "./frontend.tsx")],
    })
    return new Response(await result.outputs[0]?.text(),
      {
        headers: {
          "Content-Type": "application/javascript",
          // 1week
          //"Cache-Control":
          //  process.env.NODE_ENV === "production"
          //    ? `public, max-age=${week}`
          //    : "no-cache",
        },
      }
    )
  }
}

const server = serve({
  routes: {
    "/styles.css": new Response(await tailwindcss(), {
      headers: { "Content-Type": "text/css" }
    }),
    "/main.js": buildFrontend()
  },
  port: 8088,
  fetch: lookup(),
  development: process.env.NODE_ENV !== "production",
});

console.log(`🚀 Server running at ${server.url} in ${contentDir}`);

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
