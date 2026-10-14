"use client";

import type { ComponentPropsWithoutRef } from "react";

import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";
import { formatMyanmarAmount } from "@/lib/myanmar-numbers";

interface MyanmarPriceProps extends Omit<ComponentPropsWithoutRef<"strong">, "children"> {
  price: number;
  purpose: string;
}

function MyanmarPrice({ price, purpose, className, ...props }: MyanmarPriceProps) {
  const { isMyanmar } = useLanguage();
  const isSale = purpose === "sale";
  const value = isSale ? price / 1_000_000 : price / 100_000;

  if (isMyanmar) {
    const myAmount = formatMyanmarAmount(value);
    const unit = isSale ? "သန်း" : "သိန်း";
    return (
      <strong
        data-type="number"
        aria-label={`${myAmount} ${unit}`}
        className={cn("myanmar-price", className)}
        {...props}
      >
        <span className="myanmar-price__amount">{myAmount}</span>
        <span lang="my" className="myanmar-price__unit">{unit}</span>
      </strong>
    );
  }

  const enAmount = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  const enUnit = isSale ? "M" : "L";
  const enLabel = isSale ? "million" : "lakh";
  return (
    <strong
      data-type="number"
      aria-label={`${enAmount} ${enLabel}`}
      className={cn("myanmar-price", className)}
      {...props}
    >
      <span className="myanmar-price__amount">{enAmount}</span>
      <span className="myanmar-price__unit">{enUnit}</span>
    </strong>
  );
}

export { MyanmarPrice };