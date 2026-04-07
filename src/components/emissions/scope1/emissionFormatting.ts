export const formatDynamicEmission = (raw: number, minDecimals = 3, maxDecimals = 12): string => {
  if (!isFinite(raw)) return "";

  const abs = Math.abs(raw);
  let decimals = minDecimals;

  if (abs > 0 && abs < 10 ** -minDecimals) {
    while (decimals < maxDecimals && Number(abs.toFixed(decimals)) === 0) {
      decimals += 1;
    }
  }

  return raw.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
