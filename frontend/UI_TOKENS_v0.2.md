# UI_TOKENS.md

**Project:** ИИ-агент анализа реестра процессов  
**Version:** v0.2  
**Status:** READY FOR IMPLEMENTATION

## 1. Visual direction

Light enterprise / gov-tech UI.

Characteristics:
- restrained;
- clear;
- analytical;
- neutral;
- trustworthy;
- modern without decorative AI styling.

Do not use:
- AI neon;
- glassmorphism;
- excessive gradients;
- glowing elements;
- chatbot styling;
- decorative futuristic effects.

## 2. Typography

Primary:

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Technical values:

```css
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
```

Use monospace for:
- IDs;
- rule IDs;
- source refs;
- technical codes/statuses.

## 3. Base colors

```css
--bg-app: #F6F8FB;
--bg-surface: #FFFFFF;
--bg-subtle: #F8FAFC;

--text-primary: #172033;
--text-secondary: #5F6B7A;
--text-muted: #8A94A3;
--text-inverse: #FFFFFF;

--border-default: #E3E8EF;
--border-strong: #CBD3DF;
```

## 4. Primary

```css
--primary: #2563EB;
--primary-hover: #1D4ED8;
--primary-active: #1E40AF;
--primary-soft: #EFF6FF;
```

Use for primary actions, selected interactive elements and important links.

Do not use as decorative large-area background.

## 5. Semantic colors

### Success

```css
--success: #15803D;
--success-bg: #F0FDF4;
--success-border: #BBF7D0;
```

### Warning

```css
--warning: #B45309;
--warning-bg: #FFFBEB;
--warning-border: #FDE68A;
```

### Error

```css
--error: #B42318;
--error-bg: #FEF3F2;
--error-border: #FECDCA;
```

### Info

```css
--info: #2563EB;
--info-bg: #EFF6FF;
--info-border: #BFDBFE;
```

Semantic colors communicate state, not decoration.

## 6. VALUE / FEASIBILITY

Keep both visually separate but within one system.

Use:
- same card structure;
- same typography;
- same spacing;
- clear labels.

Do not create competing saturated themes.

Do not visually merge the two axes into one `/50` score.

## 7. Missing values

```text
—
```

Style:
- neutral;
- muted;
- not error-red;
- never interpreted as zero.

## 8. Score hierarchy

### Full score

When backend provides a full score, it is the primary numeric value.

Example:

```text
20 / 25
```

Coverage/range are secondary metadata.

### Partial score

When full score is `null`, do not use `knownSum` as the main `/25` score.

Primary analytical value:

```text
19–23 / 25
```

Secondary metadata:

```text
Известная сумма: 18
Coverage 80%
```

The visual hierarchy must make it clear that the range is not an exact score and the known sum is not the final score.

## 9. Coverage

Secondary metadata.

Example:

```text
Coverage 80%
```

Coverage must not be visually stronger than a full score or the primary range of a partial result.

## 10. Known sum

Secondary metadata used only when backend returns a partial axis result.

Example:

```text
Известная сумма: 18
```

Never render known sum as `18 / 25` when full score is `null`.

## 11. Score range

Example:

```text
19–23
```

Hierarchy:
- secondary to a fully known score;
- primary analytical value when full score is `null`.

Range must remain visually distinguishable from an exact score.

## 12. Spacing

8px-based system:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

## 13. Radius

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
```

Avoid highly rounded consumer-app cards.

## 14. Shadows

```css
--shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.05);
--shadow-md: 0 4px 12px rgba(16, 24, 40, 0.08);
```

No glow.

## 15. Cards

```css
background: var(--bg-surface);
border: 1px solid var(--border-default);
border-radius: var(--radius-md);
```

## 16. Buttons

Primary:
- blue background;
- white text;
- hover / active / disabled states.

Secondary:
- white/subtle background;
- neutral border.

## 17. Status badges

Use compact badges for:
- PRE-SCORE;
- INTERVIEW SCORE;
- VERIFIED SCORE;
- warning;
- error;
- requires verification;
- success.

Status includes text, not color only.

A status badge communicates backend state; frontend does not infer score stage from completeness or color.

## 18. Icons

Use **Lucide**.

Consistent stroke style.

## 19. Motion

Restrained:

```css
--motion-fast: 120ms;
--motion-base: 180ms;
--motion-slow: 240ms;
```

Allowed:
- drawer open/close;
- small hover transitions;
- loading transitions.

Avoid:
- bounce;
- glow;
- continuous decorative animation;
- animated gradients.

## 20. Focus

```css
--focus-ring: rgba(37, 99, 235, 0.28);
```

Visible keyboard focus required.

## 21. Density

Prefer:
- moderate density;
- compact metadata;
- readable criteria rows;
- enough whitespace between analytical groups.

Avoid oversized marketing typography/cards.

## 22. Responsive

Desktop-first.

On narrower screens:
- cards stack;
- VALUE / FEASIBILITY may become vertical;
- Process Selection uses full available width;
- Source Drawer may take more width;
- no horizontal overflow.

## 23. Constraints summary

```text
Light enterprise / gov-tech
Inter
Neutral white surfaces
Blue primary actions
Semantic success / warning / error / info
Lucide
Restrained motion
Monospace technical values
Separate VALUE / FEASIBILITY
null → —
Full score != known sum
Partial result: range primary, known sum + coverage secondary
PRE / INTERVIEW / VERIFIED status badges
No AI neon
No glassmorphism
No excessive gradients
No chatbot styling
```
