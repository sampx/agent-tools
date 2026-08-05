---
trigger: model_decision
description: Follow this rule when developing Astro projects.
keywords:
  - 'astro'
  - '*博客界面*'
---
# Astro Development Conventions

## Astro Components

```astro
---
// Frontmatter: imports, interfaces, props, logic
import { Icon } from 'astro-icon/components';
import type { Props } from '~/types';

const { prop1 = 'default', prop2 } = Astro.props;
---

<!-- Template: JSX-like syntax -->
<div class={prop1}>
  {condition && <Component />}
</div>
```

- Use the `---` delimiter to separate frontmatter from the template
- Name the props interface `Props` at the top of the frontmatter
- Use Astro's `class:list` for conditional classes
- Use `set:html` to insert raw HTML, rather than `dangerouslySetInnerHTML`

## Routing

- File-based routing in `src/pages/`
- Static: `.astro` files are pre-rendered
- Dynamic: set `export const prerender = false;` for SSR
- API routes: `.ts` files exporting GET/POST functions that return a Response
- Catch-all: `[...param].astro` for nested routes

## Styling

- Use Tailwind CSS for all styling
- Use the `class:list` directive for conditional classes
- Avoid inline styles unless necessary
- Dark mode: consistently use the `dark:` prefix

## Imports

- Use the `~` alias for all src imports: `import { foo } from '~/lib/server/db'`
- Group imports: external packages first, then local imports
- Non-TypeScript imports in Astro files require explicit file extensions

## React Component Integration

- Use functional components with hooks (`useState`, `useEffect`)
- Use `export default function ComponentName()`
- Type props with interfaces
- Clean up in the `useEffect` return function
- Handle errors with try/catch, log to the console

## Naming Conventions

- **Files**: kebab-case (`toggle-theme.astro`, `auth-buttons-client.tsx`)
- **Components**: PascalCase (`ToggleTheme`, `AuthButtonsClient`)
- **Functions/variables**: camelCase (`getUserFromGitHubId`, `validateSessionToken`)
- **Constants**: SCREAMING_SNAKE_CASE (`APP_BLOG`, `BLOG_BASE`)
- **Interfaces/types**: PascalCase, usually ending in `...Props` or `...Result`

## Environment Variables

- Stored in `.env` (git-ignored)
- Accessed via `import.meta.env.PROD`, `import.meta.env.DEV`

## Error Handling

- Server side: return appropriate HTTP status codes (401, 404, 500)
- Client side: use try/catch for async operations, log errors, show user feedback
- API routes: always check the `context.locals.session` authentication state
