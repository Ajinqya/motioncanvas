# shadcn/ui Setup

This project now uses shadcn/ui for the UI components along with Tailwind CSS.

## What's Installed

- **Tailwind CSS** with autoprefixer
- **shadcn/ui** components (New York style)
- **lucide-react** for icons
- **class-variance-authority** and **tailwind-merge** for component styling

## Available Components

The following shadcn/ui components are installed in `src/components/ui/`:

- `button` - Button component with multiple variants
- `card` - Card component with header, content, footer
- `badge` - Badge component for tags
- `alert-dialog` - Alert dialog for confirmations
- `dialog` - Modal dialog component
- `slider` - Slider component for ranges

## Adding More Components

To add more shadcn/ui components, run:

```bash
npx shadcn@latest add <component-name>
```

Then move the files from `@/components/ui/` to `src/components/ui/`:

```bash
mv @/components/ui/* src/components/ui/
rm -rf @
```

## Usage Example

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function MyComponent() {
  return (
    <Card>
      <CardContent>
        <CardTitle>Hello World</CardTitle>
        <Badge variant="secondary">Tag</Badge>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  );
}
```

## Dark Mode

The app is configured with dark mode by default. The `dark` class is applied to the `<html>` element in `index.html`.

## Customization

- **Colors**: Edit `src/index.css` to customize the color scheme
- **Tailwind Config**: Edit `tailwind.config.js` to add custom utilities
- **Component Config**: Edit `components.json` to change shadcn/ui settings

## Path Aliases

The project uses `@/` as a path alias pointing to the `src/` directory:

- `@/components/ui/button` → `src/components/ui/button`
- `@/lib/utils` → `src/lib/utils`

This is configured in:
- `vite.config.ts` - for Vite
- `tsconfig.app.json` - for TypeScript
- `components.json` - for shadcn/ui CLI
