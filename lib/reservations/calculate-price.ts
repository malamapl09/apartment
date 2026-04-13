import type { SpacePricingType } from "@/types";

export interface PriceInput {
  pricingType: SpacePricingType;
  rate: number;
  depositAmount: number;
  startTime: Date;
  endTime: Date;
}

export interface PriceBreakdown {
  rateTotal: number;
  deposit: number;
  total: number;
  quantity: number;
}

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

export function calculateReservationPrice({
  pricingType,
  rate,
  depositAmount,
  startTime,
  endTime,
}: PriceInput): PriceBreakdown {
  const durationMs = Math.max(0, endTime.getTime() - startTime.getTime());

  let quantity: number;
  let rateTotal: number;

  switch (pricingType) {
    case "flat_rate":
      quantity = 1;
      rateTotal = rate;
      break;
    case "per_day":
      // At least 1 day even for short bookings; ceil so a booking spanning
      // two calendar days (e.g. 10pm-2am) counts as 2.
      quantity = Math.max(1, Math.ceil(durationMs / MS_PER_DAY));
      rateTotal = quantity * rate;
      break;
    case "hourly":
    default:
      quantity = durationMs / MS_PER_HOUR;
      rateTotal = quantity * rate;
      break;
  }

  const deposit = depositAmount || 0;
  return {
    rateTotal,
    deposit,
    total: rateTotal + deposit,
    quantity,
  };
}
