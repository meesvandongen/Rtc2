import type { SVGProps } from 'react'

/**
 * Inline stroke icons. Kept dependency-free so the package ships no icon font
 * or peer icon library; every glyph inherits `currentColor` and is sized by
 * the `--rtc-icon-size` variable.
 *
 * Size comes from the `.rtc-icon` CSS rule rather than `width`/`height`
 * attributes: those are SVG presentation attributes and reject `var()`.
 */
function Icon({ children, className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={['rtc-icon', className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export const ArrowUpIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Icon>
)

export const ArrowDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </Icon>
)

/**
 * The "unsorted" glyph.
 *
 * Two half-height arrows, mirrored about the centre of the 24-unit box, so it
 * occupies the same optical space as the single up/down arrows it alternates
 * with. The previous drawing shared one shaft between both heads and sat a
 * unit off-centre, which read as misalignment next to the sorted states.
 */
export const ArrowUpDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M7 20V4M4 7l3-3 3 3M17 4v16M20 17l-3 3-3-3" />
  </Icon>
)

export const ChevronRightIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M9 18l6-6-6-6" />
  </Icon>
)

export const ChevronLeftIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M15 18l-6-6 6-6" />
  </Icon>
)

export const ChevronDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
)

export const ChevronsLeftIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
  </Icon>
)

export const ChevronsRightIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
  </Icon>
)

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Icon>
)

export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Icon>
)

export const FilterIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 5h18l-7 8v6l-4 2v-8z" />
  </Icon>
)

export const ColumnsIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16M15 4v16" />
  </Icon>
)

export const DensityIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
)

/**
 * Transpose: the mathematician's mark for it — a matrix reflected in its main
 * diagonal — drawn as a frame with a double-headed diagonal inside. Two corner
 * brackets stand in for the arrowheads, since a stroked arrowhead at this size
 * fills in and reads as a dot.
 */
export const TransposeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 4h16v16H4z" />
    <path d="m16 8-8 8M11 8h5v5M13 16H8v-5" />
  </Icon>
)

export const FullScreenIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3" />
  </Icon>
)

export const ExitFullScreenIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 8h4V4M20 8h-4V4M4 16h4v4M20 16h-4v4" />
  </Icon>
)

export const MoreVerticalIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="5" r="1.6" fill="currentColor" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    <circle cx="12" cy="19" r="1.6" fill="currentColor" />
  </Icon>
)

export const EyeOffIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 3l18 18M10.6 10.7a2 2 0 002.8 2.8" />
    <path d="M6.7 6.8C4.6 8.1 3 10 2 12c2 3.9 5.6 6 10 6 1.7 0 3.2-.3 4.6-1M9.9 5.2A9.9 9.9 0 0112 5c4.4 0 8 2.1 10 6a15 15 0 01-3 3.9" />
  </Icon>
)

export const EyeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="2.5" />
  </Icon>
)

export const PinIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z" />
  </Icon>
)

export const PinOffIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 3l18 18M9 3h6l-1 6 3 3v2h-4M8 14H7v-2l1.5-1.5M12 17v5" />
  </Icon>
)

export const GroupIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="4" width="7" height="7" rx="1.5" />
    <rect x="14" y="4" width="7" height="7" rx="1.5" />
    <rect x="8.5" y="14" width="7" height="7" rx="1.5" />
  </Icon>
)

export const DragIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="9" cy="6" r="1.4" fill="currentColor" />
    <circle cx="15" cy="6" r="1.4" fill="currentColor" />
    <circle cx="9" cy="12" r="1.4" fill="currentColor" />
    <circle cx="15" cy="12" r="1.4" fill="currentColor" />
    <circle cx="9" cy="18" r="1.4" fill="currentColor" />
    <circle cx="15" cy="18" r="1.4" fill="currentColor" />
  </Icon>
)

export const EditIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 20h4l10-10-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
)

export const SaveIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Icon>
)

export const AlertIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6M12 16.5v.5" />
  </Icon>
)

export const ResetIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
)
