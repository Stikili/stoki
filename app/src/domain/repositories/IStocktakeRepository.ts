import { Stocktake, NewStocktake } from '../entities/stocktake'

export interface IStocktakeRepository {
  /**
   * Persist the stocktake header + every counted line. Lines with variance = 0
   * are still saved so the audit trail is complete.
   */
  create(storeId: string, performedBy: string | null, data: NewStocktake): Promise<Stocktake>

  /** Most-recent stocktakes first, with their lines. Caller decides limit. */
  findRecent(storeId: string, limit?: number): Promise<Stocktake[]>
}
