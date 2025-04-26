"use server-entry";

import '../frontend';

import { type FunctionComponent } from 'react';
import { Layout } from './Layout';
import { Navbar } from "./Navbar";
import { Counter } from './Counter';

type Props = {};

export const Page: FunctionComponent<Props> = () => {
  return (
  <Layout>
    <Navbar />
    <main className="mx-auto container px-8 mt-10">
      <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: "hier" }} />
      <p>Here is a client component: <Counter /></p>
    </main>
  </Layout>
)
}

