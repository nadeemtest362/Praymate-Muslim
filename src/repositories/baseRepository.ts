import { emitDataChange } from '../lib/eventBus';

// Base repository with common patterns
export abstract class BaseRepository {
  protected abstract tableName: string;
  protected abstract eventPrefix: 'prayers' | 'people' | 'intentions' | 'profiles';

  // Common error handling
  protected handleError(error: any, operation: string): Error {
    console.error(`[${this.constructor.name}] ${operation} error:`, error);
    
    if (error?.code === '23505') {
      return new Error('This item already exists');
    }
    if (error?.code === '23503') {
      return new Error('Cannot delete item - it is referenced by other data');
    }
    if (error?.code === 'PGRST116') {
      return new Error('Item not found');
    }
    
    return new Error(error?.message || `Failed to ${operation.toLowerCase()}`);
  }

  // Common audit fields
  protected getAuditFields() {
    return {
      updated_at: new Date().toISOString()
    };
  }

  // Emit data change events
  protected emitDataEvent(
    action: 'created' | 'updated' | 'deleted',
    userId: string,
    itemId: string
  ) {
    emitDataChange(this.eventPrefix, action, { userId, id: itemId });
  }
}
