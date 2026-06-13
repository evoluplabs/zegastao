import { useRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  wrapperClassName?: string;
}

/**
 * Input de valor monetário em BRL.
 * Armazena centavos internamente para evitar erros de ponto flutuante.
 * Sempre exibe "R$ X,XX", aceita apenas dígitos.
 */
export function CurrencyInput({
  value,
  onChange,
  label,
  wrapperClassName,
  className,
  ...props
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function formatDisplay(cents: number): string {
    const v = (cents / 100).toFixed(2).replace('.', ',');
    const [int, dec] = v.split(',');
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted},${dec}`;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    const cents = parseInt(digits || '0', 10);
    const capped = Math.min(cents, 9999999999); // 99.999.999,99
    onChange(capped / 100);
  }

  const cents = Math.round((value || 0) * 100);
  const displayed = formatDisplay(cents);

  return (
    <div className={cn('space-y-1', wrapperClassName)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <span className="absolute left-3 text-sm text-muted-foreground select-none">R$</span>
        <input
          ref={inputRef}
          inputMode="numeric"
          value={displayed}
          onChange={handleChange}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
}

interface PercentInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;        // armazenado como decimal (0.025 = 2,5%)
  onChange: (decimal: number) => void;
  label?: string;
  wrapperClassName?: string;
}

/**
 * Input de taxa percentual.
 * O usuário digita "2,5" e o componente armazena 0.025.
 */
export function PercentInput({
  value,
  onChange,
  label,
  wrapperClassName,
  className,
  ...props
}: PercentInputProps) {
  const displayValue = value > 0 ? (value * 100).toFixed(2).replace('.', ',') : '';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d,]/g, '');
    // Apenas uma vírgula
    const parts = raw.split(',');
    const normalized = parts.length > 2
      ? parts[0] + ',' + parts.slice(1).join('')
      : raw;
    // Máximo 2 casas decimais
    const [int, dec] = normalized.split(',');
    const trimmed = dec !== undefined ? `${int},${dec.slice(0, 2)}` : normalized;
    const asFloat = parseFloat(trimmed.replace(',', '.') || '0');
    const clamped = Math.min(Math.max(0, asFloat), 99.99);
    onChange(clamped / 100);
  }

  return (
    <div className={cn('space-y-1', wrapperClassName)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          placeholder="0,00"
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-8 py-1 text-sm shadow-sm transition-colors',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        <span className="absolute right-3 text-sm text-muted-foreground select-none">%</span>
      </div>
    </div>
  );
}
