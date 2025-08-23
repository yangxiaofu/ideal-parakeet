# Firestore Query Strategy

## Index-Free Query Optimization

To avoid Firestore composite index requirements, we use a "simple query + client-side filtering" strategy:

### Strategy Overview

1. **Single-field queries** - Use only one `where()` clause at database level
2. **Client-side filtering** - Apply additional filters in JavaScript
3. **Client-side sorting** - Sort results after fetching
4. **Graceful fallbacks** - Fallback to basic queries if any issues occur

### Examples

#### ❌ Requires Composite Index
```typescript
// This requires a composite index on (symbol, type, createdAt)
query(
  collectionRef,
  where('symbol', '==', 'AAPL'),
  where('type', '==', 'DCF'),
  orderBy('createdAt', 'desc')
)
```

#### ✅ Index-Free Approach
```typescript
// Query with single filter
const q = query(
  collectionRef,
  where('symbol', '==', 'AAPL')
);

// Apply additional filters client-side
const results = querySnap.docs
  .map(doc => convertFromFirestore(doc))
  .filter(calc => calc.type === 'DCF')
  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
```

### Trade-offs

**Pros:**
- ✅ No composite indexes required
- ✅ Works immediately without index creation delays
- ✅ Resilient to Firestore index issues
- ✅ Simplified deployment

**Cons:**
- ⚠️ More data transferred over network (but minimal for user-scoped collections)
- ⚠️ Slightly more client-side processing

### Performance Considerations

- **User-scoped collections** keep data volume manageable
- **Client-side filtering** is fast for typical user calculation counts (< 1000)
- **Network overhead** is minimal compared to index creation complexity

This approach prioritizes reliability and simplicity over micro-optimizations.