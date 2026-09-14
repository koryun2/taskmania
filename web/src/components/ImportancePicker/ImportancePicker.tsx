import { Group, Option } from "./ImportancePicker.styles";
import { IMPORTANCE_LABELS, IMPORTANCE_OPTIONS } from "../../constants/board";
import type { Importance } from "../../lib/types";

interface ImportancePickerProps {
  value: Importance;
  onChange: (value: Importance) => void;
  disabled?: boolean;
  labelledBy: string;
}

/**
 * Three buttons that behave as one radio group.
 *
 * They are buttons rather than real radio inputs to get the segmented look,
 * so the radio semantics have to be supplied by hand: the group owns the
 * label, each option reports aria-checked, and only the selected one is in the
 * tab order, which is what lets arrow keys move between them.
 */
export function ImportancePicker({ value, onChange, disabled, labelledBy }: ImportancePickerProps) {
  const move = (delta: number) => {
    const index = IMPORTANCE_OPTIONS.indexOf(value);
    const next = IMPORTANCE_OPTIONS[(index + delta + IMPORTANCE_OPTIONS.length) % IMPORTANCE_OPTIONS.length];
    if (next) onChange(next);
  };

  return (
    <Group role="radiogroup" aria-labelledby={labelledBy}>
      {IMPORTANCE_OPTIONS.map((option) => {
        const selected = option === value;
        return (
          <Option
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            $selected={selected}
            $level={option}
            disabled={disabled}
            onClick={() => onChange(option)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(-1);
              }
            }}
          >
            {IMPORTANCE_LABELS[option]}
          </Option>
        );
      })}
    </Group>
  );
}
