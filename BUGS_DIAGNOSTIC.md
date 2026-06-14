# Bug Diagnostic Report

## Issue 1: Items Box Not Selectable

**Possible Causes:**
1. **ScrollView blocking touch events** - Category selector wrapped in horizontal ScrollView might need scrollEnabled={false} when not scrolling
2. **zIndex conflict** - AddressAutocomplete dropdown (zIndex=10) might be covering controls below it
3. **pointerEvents not set** - Controls might need pointerEvents="auto" to be selectable

**Affected Components:**
- Category selector (lines 299-325): ScrollView with category chips
- Weight selector (lines 330-363): TouchableOpacity weight chips  
- Description input (lines 387-398): Multiline Input field

**Questions:**
- Which specific box is not selectable? 
  - [ ] Category selector ("What are you moving?")
  - [ ] Weight selector ("How heavy is the load?")
  - [ ] Description input ("Describe Your Items")

---

## Issue 2: Login Screen Faulty

**Possible Issues Found:**

### A. Missing spacing in Input components (SignInScreen.tsx:43-44)
**Problem:** Input components stacked directly without spacing:
```tsx
<Input label="Email" value={email} onChangeText={setEmail} ... />
<Input label="Password" value={password} onChangeText={setPassword} ... />
```
Should have margin between them.

### B. No error state styling
The Login form doesn't show validation errors when:
- Email is invalid
- Password is too short
- Fields are empty

### C. Missing visual feedback
- No focus ring on inputs
- No loading state for the email/password fields
- Button might be partially hidden if keyboard is open

### D. Back button might not work
Line 48 navigates to 'RoleSelect' which might not exist

---

## Proposed Fixes

### Fix 1: Add padding/spacing to Input fields in SignInScreen
```tsx
<View style={{ marginBottom: 16 }}>
  <Input label="Email" ... />
</View>
<View style={{ marginBottom: 16 }}>
  <Input label="Password" ... />
</View>
```

### Fix 2: Add validation to sign-in
```tsx
const handleSignIn = async () => {
  // Validate email
  if (!email.includes('@')) {
    Alert.alert('Invalid email', 'Please enter a valid email address');
    return;
  }
  // Validate password
  if (password.length < 6) {
    Alert.alert('Invalid password', 'Password must be at least 6 characters');
    return;
  }
  // ... rest of sign in
};
```

### Fix 3: Fix category/weight selection (if needed)
Add pointerEvents and proper zIndex:
```tsx
// For ScrollView with categories
<View style={{ zIndex: 1, pointerEvents: 'auto' }}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {/* categories */}
  </ScrollView>
</View>

// For weight chips
<View style={{ zIndex: 1, pointerEvents: 'auto' }}>
  {/* weight options */}
</View>
```

### Fix 4: Reduce AddressAutocomplete zIndex conflict
If dropdown is blocking items below, reduce its zIndex or add pointerEvents:
```tsx
// In AddressAutocomplete
<View style={{ zIndex: 5, pointerEvents: open ? 'auto' : 'none' }}>
  {/* dropdown only blocks when open */}
</View>
```

---

## Required Information

Please clarify:
1. **Which item box is not selectable?** Category / Weight / Description input
2. **What's wrong with login?** Can't tap inputs? No error messages? Navigation broken?
3. **What behavior do you expect?**

---

## Status
🔴 WAITING FOR USER CLARIFICATION before implementing fixes
