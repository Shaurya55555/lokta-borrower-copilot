import { LTV, PRODUCTS, UNSECURED_ASK_INCOME_MULTIPLE, type ProductId } from './config';
import type { Answers } from './types';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export interface Routing {
  product: ProductId;
  why: string;
  /** ceiling from collateral, if the product is secured against an asset */
  collateralCeiling?: number;
  /** a cheaper secured alternative the borrower should ask for by name */
  alternative?: { product: ProductId; why: string };
}

function usableCollateral(a: Answers): { value: number; kind: string } | null {
  if (!a.collateralValue || a.collateralValue <= 0) return null;
  if (a.collateralEncumbered) return null;
  return { value: a.collateralValue, kind: a.collateralType ?? 'residential' };
}

/**
 * §5 - Which loan this should even be. Routes on purpose + assets + amount,
 * before any pricing.
 */
export function routeProduct(a: Answers): Routing {
  const purpose = a.purpose;
  const amount = a.amountWanted ?? 0;
  const ami = a.netMonthlyIncome ?? 0;
  const coll = usableCollateral(a);

  // 1. Home purchase / construction / renovation → home loan
  if (purpose === 'home_purchase' || purpose === 'home_renovation') {
    return { product: 'home', why: 'The loan is for a home, so it is priced as a home loan - the cheapest secured money available.' };
  }

  // 2. Vehicle → vehicle loan (EV livelihood → green scheme)
  if (purpose === 'vehicle') {
    if (a.loanIsProductive) {
      return {
        product: 'ev_two_wheeler',
        why: 'A vehicle bought to earn a living qualifies for EV / green financing schemes, which price well below a personal loan for the same purchase. Ask for it by name.',
      };
    }
    return { product: 'two_wheeler', why: 'A vehicle loan is secured by the vehicle itself, so it is far cheaper than putting the same purchase on a personal loan.' };
  }

  // 3. Business / working capital
  if (purpose === 'business_expansion' || purpose === 'working_capital') {
    if (coll && coll.value > 0) {
      const ltv = coll.kind === 'commercial' ? LTV.lap_commercial : LTV.lap_residential;
      return {
        product: 'lap',
        collateralCeiling: coll.value * ltv,
        why: `You own ${coll.kind} property worth ${inr(coll.value)} free of any loan. A loan against it (LAP) at ~${Math.round(ltv * 100)}% LTV lets your asset do the talking instead of a credit history you do not have - and it prices roughly half of an unsecured business loan.`,
      };
    }
    return {
      product: 'business_unsecured',
      why: 'No collateral was given, so this can only be an unsecured business loan - small ticket, high rate. If you own property, add it and re-run: the loan gets much bigger and much cheaper.',
    };
  }

  // 4. Gold available + small/fast need
  if (coll && coll.kind === 'gold') {
    return {
      product: 'gold',
      collateralCeiling: coll.value * LTV.gold,
      why: `A gold loan against your ${inr(coll.value)} of gold is same-day, needs no income proof, and prices below a personal loan.`,
    };
  }

  // 5. Default: consumption / salaried → personal loan
  const routing: Routing = {
    product: 'personal',
    why: 'For a consumption purpose with no asset to pledge, a personal loan is the default - it is also the most expensive money here, so borrow the least you can.',
  };

  // 5b. Recommend switching to secured if the unsecured ask is large and collateral exists
  if (coll && ami > 0 && amount > UNSECURED_ASK_INCOME_MULTIPLE * ami) {
    const ltv = coll.kind === 'commercial' ? LTV.lap_commercial : coll.kind === 'gold' ? LTV.gold : LTV.lap_residential;
    routing.alternative = {
      product: coll.kind === 'gold' ? 'gold' : 'lap',
      why: `Your ask is over ${UNSECURED_ASK_INCOME_MULTIPLE}× your monthly income. Pledging your ${coll.kind} (${inr(coll.value)}, ~${inr(coll.value * ltv)} available) would roughly halve the rate. Worth it for an amount this size.`,
    };
  }

  return routing;
}

export const productLabel = (id: ProductId) => PRODUCTS[id].label;
