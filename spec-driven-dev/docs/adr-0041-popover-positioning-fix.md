# ADR: LineBlamePopover positioning fix

**Status**: implemented
**Status history**:
- 2026-04-23: accepted
- 2026-04-23: implemented — bounding rect anchor, 4px overlap, hover bridge dismiss timer in AdrDetail + SpecDetail

## Overview

Fix LineBlamePopover positioning so the popover appears adjacent to the hovered block element, not offset by the mouse cursor position. The current implementation positions the popover at `(event.clientY + 12, event.clientX)` which creates a gap between the block and the popover — the user's mouse leaves the block before reaching the popover, dismissing it.

## Motivation

User report: "when I hover over a line, it's a bit too far. to actually be able to hover the popover as well." The popover is unreachable without pinning because the dismiss-on-mouseleave fires before the cursor crosses the gap. This makes the hover interaction unusable for its primary purpose.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Positioning strategy | Anchor to the hovered block element's bounding rect, not to `event.clientY/clientX` | The block element is the stable anchor. Positioning relative to the mouse cursor creates a gap that varies with where in the block the user hovers. Anchoring to the element's right edge or bottom edge gives a consistent, reachable position. |
| Gap tolerance | Popover overlaps or is flush with the hovered block — zero visible gap | Any gap between block and popover means the mouse leaves the block's bounds before entering the popover, triggering dismiss. The popover should either overlap the block edge slightly or be flush with it. |
| Hover bridge | The popover itself keeps the block highlighted while the mouse is inside it | Moving from block → popover should not dismiss. The popover's mouseenter should maintain the active state; only moving to a *different* block or empty space dismisses. |

## Impact

- `docs-dashboard` frontend only — `LineBlamePopover` positioning and `AdrDetail`/`SpecDetail` hover handlers.
- No spec update needed (spec already describes the correct behavior; this is a code fix).

## Scope

Fix the popover position anchor and hover bridge. No other changes.
