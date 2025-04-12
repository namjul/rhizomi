import { type FunctionComponent } from 'react';

type Props = {
  children: string;
};

export const Layout: FunctionComponent<Props> = (props: Props) => (
  <html lang="en">
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
      <title>rhizome</title>
      <link rel="stylesheet" href="/index.css" />
    </head>
    <body>
      <main className="container mx-auto mt-10">
        <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: props.children }}>
        </article>
      </main>
    </body>
  </html>
)

