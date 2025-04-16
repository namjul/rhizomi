import { type FunctionComponent } from 'react';
import { Layout } from './Layout';
import { Navbar } from "./Navbar";

type Props = { content: string };

export const Page: FunctionComponent<Props> = (props) => (
  <Layout>
    <Navbar />
    <main className="mx-auto container px-8 mt-10">
      <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: props.content }} />
    </main>
  </Layout>
)

