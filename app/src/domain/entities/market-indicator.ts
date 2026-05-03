export type MarketIndicatorKind =
  | 'sarb_repo'
  | 'sarb_prime'
  | 'fuel_petrol_95'
  | 'fuel_diesel'
  | 'cpi_yoy'
  | 'usd_zar'
  | 'eur_zar'

export const MARKET_INDICATOR_KINDS: MarketIndicatorKind[] = [
  'sarb_repo',
  'sarb_prime',
  'fuel_petrol_95',
  'fuel_diesel',
  'cpi_yoy',
  'usd_zar',
  'eur_zar',
]

/** Pretty label for admin UI / advisor surfaces. */
export const MARKET_INDICATOR_LABELS: Record<MarketIndicatorKind, string> = {
  sarb_repo:       'SARB repo rate (%)',
  sarb_prime:      'Prime rate (%)',
  fuel_petrol_95:  'Petrol 95 (R/L)',
  fuel_diesel:     'Diesel (R/L)',
  cpi_yoy:         'CPI YoY (%)',
  usd_zar:         'USD/ZAR',
  eur_zar:         'EUR/ZAR',
}

export interface MarketIndicator {
  id: string
  kind: MarketIndicatorKind
  value: number
  source: string
  measuredAt: string | null
  fetchedAt: string
  notes: string | null
}

export interface NewMarketIndicator {
  kind: MarketIndicatorKind
  value: number
  source: string
  measuredAt?: string | null
  notes?: string | null
}
