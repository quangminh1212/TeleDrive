# 🚨 SECURITY INCIDENT RESPONSE - API CREDENTIALS EXPOSURE

**Date**: 2026-02-04
**Severity**: CRITICAL
**Status**: IN PROGRESS

## Incident Summary

API credentials were accidentally committed to Git repository and pushed to GitHub.

### Exposed Data:
- **TELEGRAM_API_ID**: 21272067
- **TELEGRAM_API_HASH**: b7690dc86952dbc9b16717b101164af3
- **TELEGRAM_PHONE**: +84936374950

### Git Commits Containing Credentials:
- a81f0621ca68e8e7d36c797c4c61bf5c11dac94c (Aug 2, 2025)
- 98d1e8270d2d9ce3f11bdd567a95b3f63bc29b48 (Jul 30, 2025)
- And possibly more in history

## Immediate Actions Required

### ✅ 1. Remove .env from Git (DONE)
```bash
git rm --cached .env
```

### ⚠️ 2. REVOKE OLD CREDENTIALS (ACTION REQUIRED)
**You MUST do this immediately:**

1. Go to: https://my.telegram.org/apps
2. Log in with phone: +84936374950
3. Find app: "Telegram Unlimited Driver" (API ID: 21272067)
4. **DELETE** this application to revoke credentials

### ⚠️ 3. CREATE NEW CREDENTIALS (ACTION REQUIRED)

1. Go to: https://my.telegram.org/apps
2. Click "Create new application"
3. Fill in:
   - App title: TeleDrive
   - Short name: TeleDrive
   - Platform: Desktop
   - Description: File management app for Telegram
4. Copy the new API ID and API HASH
5. Update your local `.env` file (NOT committed to Git):
   ```env
   TELEGRAM_API_ID=<new_api_id>
   TELEGRAM_API_HASH=<new_api_hash>
   TELEGRAM_PHONE=<your_phone>
   ```

### ✅ 4. Update .env.example (DONE)
Created safe template without real credentials.

### ⚠️ 5. CLEAN GIT HISTORY (CRITICAL - Manual Action Required)

**Option A: Using BFG Repo-Cleaner (Recommended)**
```bash
# Download BFG from: https://rtyley.github.io/bfg-repo-cleaner/

# Clone a fresh copy
git clone --mirror https://github.com/yourusername/TeleDrive.git

# Run BFG to remove .env
java -jar bfg.jar --delete-files .env TeleDrive.git

# Clean up
cd TeleDrive.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: This rewrites history!)
git push --force
```

**Option B: Using git filter-repo (Alternative)**
```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove .env from entire history
git filter-repo --path .env --invert-paths

# Force push (WARNING: This rewrites history!)
git push --force
```

**⚠️ IMPORTANT NOTES:**
- These commands **REWRITE GIT HISTORY**
- All collaborators must re-clone the repository
- Any forks will still contain the old credentials
- If this is a public repo on GitHub, consider making it private or creating a new repo

### 6. Verify Cleanup
```bash
# Search for any remaining traces
git log --all --full-history --source -- .env
git grep -i "21272067" $(git rev-list --all)
git grep -i "b7690dc86952dbc9b16717b101164af3" $(git rev-list --all)
```

### 7. Monitor for Abuse
- Check Telegram API usage at: https://my.telegram.org/apps
- Watch for unusual activity on your Telegram account
- Monitor application logs for unauthorized access

## Prevention Measures (Implemented)

✅ `.env` added to `.gitignore`
✅ `.env.example` created as template
✅ Security documentation created
⚠️ Pre-commit hooks (TODO)
⚠️ Secret scanning (TODO)

## Timeline

- **2025-07-30**: First commit with credentials
- **2026-02-04**: Incident discovered during security audit
- **2026-02-04**: Immediate response initiated

## Next Steps

- [ ] Revoke old API credentials
- [ ] Create new API credentials
- [ ] Clean Git history
- [ ] Verify cleanup
- [ ] Set up pre-commit hooks to prevent future incidents
- [ ] Enable GitHub secret scanning
- [ ] Notify all collaborators (if any)

## Lessons Learned

1. Never commit `.env` files to version control
2. Always use `.env.example` with placeholder values
3. Use pre-commit hooks to prevent sensitive file commits
4. Enable secret scanning on GitHub
5. Regular security audits are essential

---

**Contact**: For questions about this incident, contact the security team.
