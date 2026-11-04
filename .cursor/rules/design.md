# Visual Foundations
- Theme: Dark mode by default, vibrant and modern.
- Backgrounds: Use slate darks (`bg-slate-900` for main background, `bg-slate-800` for cards/modals).
- Primary Accent: Electric Purple (`text-purple-500`, `bg-purple-600`, `hover:bg-purple-500`).
- Success/Profit Accent: Emerald Green (`text-emerald-400`, `bg-emerald-500/10`).
- Warning Accent: Amber/Coral (`text-amber-400`, `text-red-400`).

# Typography & Hierarchy
- Font: Inter or system-sans.
- Headings: Tight tracking (`tracking-tight`), semi-bold or bold (`font-semibold`).
- Muted Text: Use `text-slate-400` for descriptions, timestamps, and secondary table data.

# Spacing & Layout
- Density: Use comfortable spacing. Cards should have `p-6`, list items `p-4`.
- Structure: Always use Flexbox (`flex`) or CSS Grid (`grid`) for layout.
- Gaps: Standardize gaps (`gap-4` for containers, `gap-2` for tight UI clusters).

# Borders, Radius & Shadows
- Radius: Use large, smooth corners for modern feel (`rounded-2xl` for main cards, `rounded-xl` for buttons/inputs).
- Borders: Keep them subtle (`border border-slate-700/50`).
- Shadows: Use soft, diffused shadows (`shadow-lg shadow-purple-900/10`) only on interactive elements or floating modals.

# Motion & Micro-interactions
- Transitions: Apply `transition-all duration-200 ease-in-out` to all buttons, links, and interactive cards.
- Hover States: Cards should lift slightly (`hover:-translate-y-0.5`).
- Active States: Scale down slightly on click (`active:scale-95`).
