import React from "react";
import { Input } from "@/components/ui/input";
import { formatNumberWithCommas, handleFormattedNumberChange } from "./numberFormatting";

interface FormattedNumberInputProps {
  id?: string;
  placeholder?: string;
  value: number | null;
  onChange: (value: number) => void;
  onClear?: () => void;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  id,
  placeholder = "0",
  value,
  onChange,
  onClear,
  className,
  min,
  max,
  step,
  disabled,
}) => {
  const [displayValue, setDisplayValue] = React.useState(
    value == null ? "" : formatNumberWithCommas(value)
  );

  React.useEffect(() => {
    setDisplayValue(value == null ? "" : formatNumberWithCommas(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    if (inputValue === "" && onClear) {
      onClear();
      return;
    }
    handleFormattedNumberChange(inputValue, onChange);
  };

  return (
    <Input
      id={id}
      type="text"
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      className={className}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    />
  );
};
