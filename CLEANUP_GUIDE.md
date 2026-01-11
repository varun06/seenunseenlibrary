# Cleanup Guide - Removing Obsolete Files

Since you now use `add_episode_books.js` to add books incrementally, here's what can be safely removed or archived.

## 🗑️ Files That Can Be Removed

### CSV Files (Root Directory)
These were used for the initial bulk import and are no longer needed:

- `seenunseen_books_20251230_090116_unique.csv`
- `seenunseen_books_20251230_090116_expanded.csv`
- `seenunseen_books_20251230_090116_unique_fixed.numbers` (Numbers spreadsheet)

**Recommendation:** Delete these or move to an `archive/` folder if you want to keep them as historical records.

### Obsolete Scripts

1. **`scripts/download_books_name.py`**
   - Python script used to generate CSV files
   - No longer needed since you use `add_episode_books.js`
   - **Can be removed** ✅

2. **`scripts/fix_titles_from_urls.js`**
   - Was used to fix titles from Amazon URLs
   - `add_episode_books.js` handles title extraction automatically
   - **Can be removed** ✅

## ⚠️ Scripts to Keep (But Update)

### Keep These Scripts

1. **`scripts/process_books_data.js`** - ⚠️ **Keep but mark as legacy**
   - Processes CSV files into books.json
   - Only needed if you ever want to regenerate from scratch
   - Could be useful for bulk imports if you get CSV exports again
   - **Recommendation:** Keep for now, but you probably won't use it anymore

2. **`scripts/add_episode_books.js`** - ✅ **Active**
   - Your current workflow for adding new episodes

3. **`scripts/fetch_covers.js`** - ✅ **Active**
   - Fetches covers for books (used by add_episode_books.js)

4. **`scripts/extract_colors.js`** - ✅ **Keep**
   - Extracts colors from book covers

5. **`scripts/create_directories.js`** - ✅ **Keep**
   - Creates necessary directories

6. **`scripts/deduplicate_books.js`** - ✅ **Keep**
   - Utility script for maintaining data quality

## 📦 Package.json Scripts to Update

### Remove These npm Scripts:
```json
"fix-titles": "node scripts/fix_titles_from_urls.js",  // Remove
"process-data": "...",  // Keep but mark as legacy/optional
```

### Keep These:
- `add-episode` - Your main workflow
- `fetch-covers` - Still needed
- `extract-colors` - Still needed
- `create-dirs` - Still needed

## 🗂️ Recommended Cleanup Steps

1. **Create archive folder** (optional):
   ```bash
   mkdir archive
   mv seenunseen_books_*.csv archive/
   mv seenunseen_books_*.numbers archive/
   ```

2. **Delete obsolete files**:
   ```bash
   rm scripts/download_books_name.py
   rm scripts/fix_titles_from_urls.js
   ```

3. **Update package.json** - Remove `fix-titles` script

4. **Update README** - Remove references to old CSV processing workflow

## 💡 Alternative: Archive Everything

If you want to keep everything as backup but clean up the root directory:

```bash
mkdir -p archive/csv archive/scripts
mv seenunseen_books_*.csv archive/csv/
mv seenunseen_books_*.numbers archive/csv/
mv scripts/download_books_name.py archive/scripts/
mv scripts/fix_titles_from_urls.js archive/scripts/
```

This keeps everything accessible but out of the way.
