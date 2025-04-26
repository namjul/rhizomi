import path from "path";
import type { Tagged } from 'type-fest';
import { compile, optimize } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import { resolvePath } from './utils';
import { documentHandler } from './wire';

let contentDir: string | undefined

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



//async function serveHTML({ content, data }: { content: ReactNode, data: any | undefined }, status: number) {
//  const stream = await renderToReadableStream(
//    content,
//    {
//      bootstrapScriptContent: `window.content = ${JSON.stringify(data)};`,
//      bootstrapModules: ['/main.js']
//    }
//  );
//  return new Response(stream, {
//    status: status,
//    headers: {
//      'Content-Type': 'text/html; charset=utf-8',
//    },
//  });
//}

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


type Handler = (_dir: string | undefined, setDir?: (dir: string | undefined) => void | undefined) => (req: Request) => Promise<Response | undefined>

function lookup() {
  const handlers: Handler[] = [publicHandler, assetHandler, documentHandler]
  return async (req: Request) => {
    for (let i = 0; i < handlers.length; i++) {
      const handler = handlers[i]?.(contentDir, (dir) => { contentDir = dir })
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
  const style = Bun.file(path.resolve(__dirname, "./styles.css"))
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
    minify: false,
  })

  return optimizedCss
}

function buildTailwindcss() {
  return async () => {
    return new Response(await tailwindcss(), {
      headers: {
        'Content-Type': 'text/css',
      },
    })
  }
}


const server = Bun.serve({
  routes: {
    "/styles.css": buildTailwindcss(),
    "/client/*": async (req) => {
      const pathname = new URL(req.url).pathname;
      //console.log("pathname", pathname, Object.keys(routes));
      //return new Response("testkj:w");
      return new Response(Bun.file(path.resolve(__dirname, '../dist' + pathname)));
    }
  },
  fetch: lookup(),
  development: process.env.NODE_ENV !== "production",
});

console.log(`🚀 Server running at ${server.url}`);

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
