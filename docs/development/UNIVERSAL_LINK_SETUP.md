# Universal Link Setup for Magic Links

## Overview

This document outlines the setup required on `trypraymate.com` to handle magic link callbacks for the JustPray app.

## 🔗 **Current Configuration**

### **App Configuration (Updated)**

- **Magic Link Redirect**: `https://trypraymate.com/auth/callback`
- **Associated Domains**: `applinks:trypraymate.com` (in app.json)
- **Deep Link Handler**: Updated to handle universal links

### **Supabase Configuration Required**

- **Site URL**: `https://trypraymate.com`
- **Redirect URLs**: `https://trypraymate.com/auth/callback`

## 🌐 **Required Web Page Setup**

### **Create File**: `https://trypraymate.com/auth/callback`

This page needs to:

1. **Extract authentication tokens** from URL parameters
2. **Redirect to the app** using the custom URL scheme
3. **Handle both scenarios**: App installed vs. not installed

### **HTML Template for Callback Page**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JustPray - Signing You In</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          sans-serif;
        background: linear-gradient(135deg, #003366 0%, #0066cc 100%);
        color: white;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        text-align: center;
      }
      .container {
        max-width: 400px;
        padding: 2rem;
      }
      .logo {
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }
      .message {
        font-size: 1.2rem;
        margin-bottom: 2rem;
        line-height: 1.6;
      }
      .spinner {
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 2rem;
      }
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      .fallback {
        margin-top: 2rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
      }
      .fallback a {
        color: white;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">🙏</div>
      <div class="message">Signing you into JustPray...</div>
      <div class="spinner"></div>

      <div class="fallback" id="fallback" style="display: none;">
        <p>
          If the app doesn't open automatically,
          <a href="#" id="openApp">tap here to open JustPray</a>
        </p>
      </div>
    </div>

    <script>
      // Extract tokens from URL
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get("access_token");
      const refreshToken = urlParams.get("refresh_token");
      const type = urlParams.get("type");

      // Check if this is a valid magic link
      if (type === "email" && (accessToken || refreshToken)) {
        console.log("Valid magic link detected, attempting to open app...");

        // Try to open the app with the custom URL scheme
        const appUrl = `justpray://magic-link-callback?access_token=${
          accessToken || ""
        }&refresh_token=${refreshToken || ""}&type=${type}`;

        // Attempt to open the app
        window.location.href = appUrl;

        // Show fallback after a short delay
        setTimeout(() => {
          document.getElementById("fallback").style.display = "block";
          document.getElementById("openApp").href = appUrl;
        }, 2000);
      } else {
        // Invalid or missing tokens
        document.querySelector(".message").textContent =
          "Invalid or expired link. Please try again.";
        document.querySelector(".spinner").style.display = "none";
      }
    </script>
  </body>
</html>
```

## 🔧 **Implementation Steps**

### **Step 1: Upload Callback Page**

1. **Upload the HTML file** to `trypraymate.com/auth/callback`
2. **Ensure HTTPS** is enabled (required for universal links)
3. **Test the page** loads correctly

### **Step 2: Update Supabase Settings**

1. **Go to Supabase Dashboard** → Authentication → URL Configuration
2. **Set Site URL**: `https://trypraymate.com`
3. **Add Redirect URL**: `https://trypraymate.com/auth/callback`
4. **Save changes**

### **Step 3: Test the Flow**

1. **Send magic link** from app
2. **Click email link** → Should open `trypraymate.com/auth/callback`
3. **Page should redirect** to `justpray://magic-link-callback`
4. **App should open** and user gets signed in

## 🧪 **Testing**

### **Test 1: App Installed**

- Magic link → `trypraymate.com/auth/callback` → App opens automatically

### **Test 2: App Not Installed**

- Magic link → `trypraymate.com/auth/callback` → Shows fallback message

### **Test 3: Invalid Link**

- Invalid URL → Shows error message

## ⚠️ **Important Notes**

1. **HTTPS Required**: Universal links only work with HTTPS
2. **Domain Verification**: iOS needs to verify your domain
3. **Fallback Handling**: Always provide fallback for users without the app
4. **Token Security**: Tokens are passed in URL (Supabase handles this securely)

## 🔍 **Troubleshooting**

### **Common Issues**

- **App doesn't open**: Check associatedDomains in app.json
- **Page not found**: Verify callback page is uploaded
- **HTTPS errors**: Ensure SSL certificate is valid
- **Supabase errors**: Verify Site URL and Redirect URLs

---

**Status**: Ready for implementation  
**Next Action**: Upload callback page to trypraymate.com  
**Priority**: High (required for magic links to work)
