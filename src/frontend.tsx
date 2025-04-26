import { hydrateRoot } from 'react-dom/client';
import { Page } from './components/Page';

declare global {
  interface Window {
    content: string;
  }
}

hydrateRoot(document, <Page content={window.content} />);
