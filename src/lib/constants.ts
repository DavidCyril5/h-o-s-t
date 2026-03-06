
import type { CoinPackageDetails, CurrencyInfo } from "./types";

export const COIN_BASE_PRICE_NGN = 10;
export const VAT_RATE = 0.075; // 7.5% VAT

export const coinPackages: CoinPackageDetails[] = [
  { id: 'small_50', name: "Small Pack", coins: 100, priceNGN: 100 * COIN_BASE_PRICE_NGN, description: "Get started with 100 coins." },
  { id: 'medium_150', name: "Medium Pack", coins: 300, priceNGN: 300 * COIN_BASE_PRICE_NGN, description: "Most popular: 300 coins." },
  { id: 'large_300', name: "Large Pack", coins: 500, priceNGN: 500 * COIN_BASE_PRICE_NGN, description: "Best value: 500 coins." },
];

export const minipayPricesUSD = {
    'small_50': 1,
    'medium_150': 3,
    'large_300': 5,
};

export const currencyRatesList: CurrencyInfo[] = [
    { code: 'NGN', symbol: '₦', rate: 1, name: 'Nigerian Naira' },
    { code: 'USD', symbol: '$', rate: 0.00063, name: 'US Dollar' },
    { code: 'GBP', symbol: '£', rate: 0.00050, name: 'British Pound' },
    { code: 'EUR', symbol: '€', rate: 0.00058, name: 'Euro' },
    { code: 'GHS', symbol: 'GH₵', rate: 0.0094, name: 'Ghanaian Cedi' },
    { code: 'KES', symbol: 'KSh', rate: 0.093, name: 'Kenyan Shilling' },
    { code: 'ZAR', symbol: 'R', rate: 0.012, name: 'South African Rand' },
    { code: 'UGX', symbol: 'USh', rate: 2.5, name: 'Ugandan Shilling' },
    { code: 'TZS', symbol: 'TSh', rate: 1.6, name: 'Tanzanian Shilling' },
    { code: 'RWF', symbol: 'RF', rate: 0.82, name: 'Rwandan Franc' },
    { code: 'XOF', symbol: 'CFA', rate: 0.38, name: 'West African CFA franc' },
    { code: 'XAF', symbol: 'FCFA', rate: 0.38, name: 'Central African CFA franc' },
    { code: 'CAD', symbol: 'CA$', rate: 0.00086, name: 'Canadian Dollar' },
    { code: 'EGP', symbol: 'E£', rate: 0.030, name: 'Egyptian Pound' },
    { code: 'GNF', symbol: 'FG', rate: 5.4, name: 'Guinean Franc' },
    { code: 'MAD', symbol: 'MAD', rate: 0.0063, name: 'Moroccan Dirham' },
    { code: 'MWK', symbol: 'MK', rate: 1.1, name: 'Malawian Kwacha' },
    { code: 'SLL', symbol: 'Le', rate: 14.0, name: 'Sierra Leonean Leone (New)'},
    { code: 'STD', symbol: 'Db', rate: 14.0, name: 'São Tomé & Príncipe Dobra (New)' },
    { code: 'ZMW', symbol: 'ZK', rate: 0.017, name: 'Zambian Kwacha' },
    { code: 'CLP', symbol: 'CLP$', rate: 0.58, name: 'Chilean Peso' },
    { code: 'COP', symbol: 'COL$', rate: 2.5, name: 'Colombian Peso' },
];
