import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  id?: string;
  size?: 'xs' | 'sm';
  labelPosition?: 'left' | 'right';
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  id,
  size = 'sm',
  labelPosition = 'left',
}) => {
  const trackCls = size === 'xs' ? 'h-4 w-7' : 'h-5 w-9';
  const thumbCls = size === 'xs' ? 'h-3 w-3' : 'h-4 w-4';
  const shiftCls =
    size === 'xs'
      ? checked
        ? 'translate-x-3.5'
        : 'translate-x-0.5'
      : checked
        ? 'translate-x-4'
        : 'translate-x-0.5';

  const switchEl = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      style={
        checked
          ? {
              backgroundColor: 'var(--accent, #fa5008)',
              borderColor: 'var(--accent, #fa5008)',
            }
          : undefined
      }
      className={`relative inline-flex shrink-0 items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fa5008] ${trackCls} ${
        checked ? 'border-[#fa5008] bg-[#fa5008]' : 'border-[#d6d2c8] bg-[#e5e3dc]'
      }`}
    >
      <span
        className={`inline-block transform rounded-full bg-white shadow-xs transition-transform ${thumbCls} ${shiftCls}`}
      />
    </button>
  );

  const labelClass =
    size === 'xs'
      ? 'text-[11px] font-normal text-[#6b6b6b]'
      : 'text-xs font-medium text-[#52525b]';

  const textEl =
    label || description ? (
      <div className="min-w-0">
        {label && <div className={labelClass}>{label}</div>}
        {description && (
          <div className="text-[11px] text-[#71717a] mt-0.5 leading-snug">{description}</div>
        )}
      </div>
    ) : null;

  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2 cursor-pointer select-none ${
        textEl && labelPosition === 'left' ? 'justify-between w-full' : ''
      }`}
    >
      {labelPosition === 'right' ? (
        <>
          {switchEl}
          {textEl}
        </>
      ) : (
        <>
          {textEl}
          {switchEl}
        </>
      )}
    </label>
  );
};
