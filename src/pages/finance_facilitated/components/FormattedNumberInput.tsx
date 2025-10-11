import React from 'react';
import { Input } from '@/components/ui/input';
import { formatNumberWithCommas, parseFormattedNumber, handleFormattedNumberChange } from '../utils/numberFormatting';

interface FormattedNumberInputProps {
  id?: string;
  placeholder?: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
}

export const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  id,
  placeholder = "0",
  value,
  onChange,
  className,
  min,
  max,
  step
}) => {
  const [displayValue, setDisplayValue] = React.useState(
    value ? formatNumberWithCommas(value) : ''
  );

  React.useEffect(() => {
    setDisplayValue(value ? formatNumberWithCommas(value) : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
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
    />
  );
};
