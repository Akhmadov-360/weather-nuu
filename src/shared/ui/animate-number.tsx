import { CountingNumber } from '@animate-ui/react/primitives/texts/counting-number';

type AnimateNumberProps = {
  value: number;
  fractionDigits?: number;
};

/**
 * A number that counts to its new value instead of jumping (Animate UI's CountingNumber, a spring).
 * It starts at the value it is given, so nothing counts up from zero on the first paint.
 */
export function AnimateNumber({ value, fractionDigits = 1 }: AnimateNumberProps): React.JSX.Element {
  return <CountingNumber number={value} decimalPlaces={fractionDigits} decimalSeparator="." initiallyStable />;
}
