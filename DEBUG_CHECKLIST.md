# Debug Checklist: /decision Apply Button Navigation

## Required Vercel Environment Variables

These MUST be set in Vercel → Project Settings → Environment Variables:

1. `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

**Verify in Vercel:**
- Go to: Project → Settings → Environment Variables
- Confirm both variables exist for Production
- Redeploy if you just added them

---

## DevTools Debug Steps (2 minutes)

### Step 1: Open DevTools
1. Open `/decision` page
2. Press `F12` or Right-click → Inspect
3. Open **Console** tab
4. Open **Network** tab

### Step 2: Filter Network Tab
In Network tab filter box, type:
```
pepe_decision_logs
```

Also check for:
```
rest/v1
```

### Step 3: Clear Network Log
Click the 🚫 clear button in Network tab (or press `Ctrl+Shift+E`)

### Step 4: Click "Apply now" Button
Click the button **ONCE** and watch:

**Console Tab - Look for:**
1. ✅ `logDecision fired apply` - Confirms button click
2. ✅ `logDecision before insert` - Shows data being sent
3. ✅ `logDecision insert result` - Shows success/error
4. ✅ `logDecision navigating` - Confirms navigation attempt

**Network Tab - Look for:**
1. ✅ POST request to `/rest/v1/pepe_decision_logs`
2. ✅ Status code: **201** (success) or **200** (success) or **401/403** (auth error)
3. ✅ Response body (click the request → Response tab)

**On-Page Debug Banner - Look for:**
1. Blue debug banner appears showing status:
   - `🔄 Starting...`
   - `📤 Inserting to Supabase...`
   - `✅ Insert succeeded` OR `⚠️ Insert failed: [error]`
   - `🚀 Navigating to /exit...`

---

## What Each Result Means

### ✅ POST appears with 201/200
- **Insert succeeded**
- Navigation should happen automatically
- If navigation doesn't happen → Router issue (fallbacks will trigger)

### ❌ POST appears with 401/403
- **Authentication/RLS issue**
- Check Vercel env vars are set correctly
- Check Supabase RLS policy allows INSERT for anonymous users
- Navigation will still happen (we force it)

### ❌ No POST appears at all
- **Insert not firing**
- Check Console for exceptions
- Check if button is disabled
- Check Network filter isn't hiding it

### ✅ Navigation happens but page doesn't change
- **Router issue**
- Fallback `window.location.href` should trigger after 300ms
- Check Console for "final fallback" message

---

## PowerShell Commands to Check Vercel

```powershell
# Check current branch
git branch

# Check latest commit
git log -1

# Verify file was updated
Get-Content app\decision\page.tsx | Select-String "debugStatus"
```

---

## Supabase RLS Policy Check

In Supabase Dashboard → Authentication → Policies:

Table: `pepe_decision_logs`
- Should have INSERT policy for `anon` role
- Policy should allow: `INSERT` with `true` condition (or appropriate condition)

---

## Next Steps After Debug

1. **If POST is 401/403**: Fix RLS policy or env vars
2. **If no POST**: Check button handler and console errors
3. **If POST succeeds but no nav**: Router issue - fallbacks should handle it
4. **If everything works**: Remove debug banner (set `debugStatus` to null after testing)
