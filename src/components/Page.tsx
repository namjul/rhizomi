import { type FunctionComponent } from 'react';
import { Layout } from './Layout';

type Props = { content: string };

export const Page: FunctionComponent<Props> = (props) => (
  <Layout>
    <main className="mx-auto container px-8 mt-10">
      <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: props.content }} />
    </main>
  </Layout>
)

