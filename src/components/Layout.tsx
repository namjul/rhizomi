import { type FunctionComponent, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export const Layout: FunctionComponent<Props> = (props: Props) => (
  <html lang="en">
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
      <title>rhizome</title>
      <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      <link rel="stylesheet" href="/styles.css" />
    </head>
    <body>
      {props.children}
    </body>
  </html>
)

