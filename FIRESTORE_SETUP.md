# Firestore Setup Guide

## Required Indexes

The auto-save calculation feature requires specific Firestore composite indexes to function properly. When you first use the calculation caching feature, you may see an error message with a link to create the required index.

### Automatic Index Creation

1. **Follow the Error Link**: When you encounter the index error, click the provided link to automatically create the required index in Firebase Console.

2. **Manual Index Setup**: Alternatively, you can set up indexes manually:

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `intrinsic-value-calculat-b1c20`
   - Navigate to Firestore Database → Indexes
   - Create the following composite indexes:

### Required Indexes

#### 1. Calculation by Symbol and Type
```
Collection: calculations
Fields:
  - symbol (Ascending)
  - type (Ascending) 
  - createdAt (Descending)
```

#### 2. Calculations by Symbol
```
Collection: calculations
Fields:
  - symbol (Ascending)
  - createdAt (Descending)
```

#### 3. All Calculations (Time-ordered)
```
Collection: calculations
Fields:
  - createdAt (Descending)
```

### Using the Index Configuration File

This project includes a `firestore.indexes.json` file with the required indexes. You can deploy these using Firebase CLI:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy indexes
firebase deploy --only firestore:indexes
```

### Graceful Degradation

The application includes fallback handling for missing indexes:

- **Automatic Fallback**: When indexes are missing, the app automatically falls back to client-side filtering
- **No Interruption**: Users can continue using all features while indexes are being created
- **Background Processing**: Index creation typically takes 5-15 minutes for new projects

### Index Status

You can monitor index creation progress in the Firebase Console under:
`Firestore Database → Indexes`

Indexes will show as "Building" initially and then "Enabled" once ready.

## Security Rules

The project includes strict security rules in `firestore.rules` that ensure:
- Complete user data isolation
- Only authenticated users can access their own calculations
- Protection against unauthorized data access or modification

## Troubleshooting

### Common Issues

1. **Index Creation Taking Long**: Large datasets can take longer to index. The app will continue working with fallback queries.

2. **Permission Errors**: Ensure you're logged in as the Firebase project owner or have sufficient permissions.

3. **Query Limits**: The fallback queries are limited to 50 results per symbol to maintain performance.

### Support

If you encounter issues with Firestore setup:
1. Check the browser console for detailed error messages
2. Verify your Firebase project configuration in `.env`
3. Ensure Firestore is enabled in your Firebase project
4. Contact the development team if issues persist