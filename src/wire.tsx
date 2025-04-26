import { renderRequest } from '@parcel/rsc/server';
import { marked } from "marked";
import { resolvePath, resolveTildePath } from './utils';
import { Init } from "./components/Init";
import { Page } from './components/Page';

function parseCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.get('Cookie');

  const cookieHeaderList = cookieHeader?.split('; ').map(cookie => {
    const [name, ...value] = cookie.split('=');
    return [name, value.join('=')];
  })

  return Object.fromEntries(cookieHeaderList ?? []);
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

export function documentHandler(dir: string | undefined = "~/Dropbox/memex") {
  return async (req: Request) => {
    const path = new URL(req.url).pathname;
    let realpath = resolvePath(dir, path);
    if (!realpath.endsWith(".md")) {
      realpath = `${realpath}.md`;
    }
    try {
      //const content = Bun.file(realpath)
      //const document = await content.text()
      //const htmlContent = await marked(document); // Convert markdown to HTML

      return renderRequest(req, <Page />, {component: Page});
    } catch (err) {
      return undefined
    }

  };
}

export function checkContentHandler(_dir: string | undefined, setDir: (dir: string | undefined) => void | undefined) {
  return async (req: Request) => {
    const cookieContentDir = parseCookies(req)['contentDir'] ?? ""
    const fullPath = resolveTildePath(atob(cookieContentDir))
    console.log(fullPath, setDir);
    setDir?.(fullPath)

    if (!fullPath) {
      return renderRequest(req, <Init />, {component: Init});
    }
    return undefined
  };
}

