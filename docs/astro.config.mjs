import { defineConfig } from 'astro/config';
import mermaid from 'astro-mermaid';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    mermaid(),
    starlight({
      title: 'Weather Starter Docs',
      sidebar: [
        {
          label: 'Guide',
          items: [
            { label: 'Overview', slug: '' },
            { label: 'Getting started', slug: 'getting-started' },
            { label: 'Architecture', slug: 'architecture' },
            { label: 'API', slug: 'api' },
            { label: 'Data model', slug: 'data-model' },
          ],
        },
      ],
    }),
  ],
});
