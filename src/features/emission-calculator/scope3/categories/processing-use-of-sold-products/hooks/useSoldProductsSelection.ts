import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductType } from "../types";

const ANIMATION_MS = 300;

export function useSoldProductsSelection() {
  const [productType, setProductType] = useState<ProductType | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<number>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const transitionTo = useCallback((nextType: ProductType | null) => {
    setIsAnimating(true);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setProductType(nextType);
      setIsAnimating(false);
    }, ANIMATION_MS);
  }, []);

  return {
    productType,
    isAnimating,
    onSelectIntermediate: () => transitionTo("intermediate"),
    onSelectFinal: () => transitionTo("final"),
    onBackToSelection: () => transitionTo(null),
  };
}
