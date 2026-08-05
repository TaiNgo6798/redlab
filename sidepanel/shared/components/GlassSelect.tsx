import { Select } from 'antd'
import type { SelectProps } from 'antd'

// Custom chevron — thicker stroke than Ant's default DownOutlined
const glassArrow = (
  <svg
    className="glass-select-arrow-icon"
    viewBox="0 0 12 12"
    width="12"
    height="12"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M2.2 4.2 L6 8 L9.8 4.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export function GlassSelect({ className, classNames, suffixIcon, size, ...props }: SelectProps) {
  const existingPopupRoot =
    typeof classNames?.popup === 'object' && classNames.popup?.root
      ? classNames.popup.root
      : ''
  const compact = size === 'small'

  return (
    <Select
      {...props}
      size={size}
      suffixIcon={suffixIcon === undefined ? glassArrow : suffixIcon}
      className={['glass-select', className].filter(Boolean).join(' ')}
      classNames={{
        ...classNames,
        popup: {
          ...(typeof classNames?.popup === 'object' ? classNames.popup : {}),
          root: [
            'glass-select-dropdown',
            compact ? 'glass-select-dropdown--compact' : '',
            existingPopupRoot,
          ]
            .filter(Boolean)
            .join(' '),
        },
      }}
    />
  )
}
