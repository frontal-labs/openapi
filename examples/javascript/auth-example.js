// Frontal API Authentication Examples
// Node.js examples using fetch API

const API_BASE_URL = 'https://api.frontal.dev';
const API_KEY = process.env.FRONTAL_API_KEY; // Set your API key as environment variable

class FrontalAuthAPI {
  constructor(apiKey, baseUrl = API_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.accessToken = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...options.headers
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`API Error: ${data.errors?.[0]?.message || response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async register(email, password, userData = {}) {
    console.log('Registering new user...');
    const response = await this.request('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        data: userData
      })
    });
    console.log('Registration successful:', response);
    return response;
  }

  async login(email, password) {
    console.log('Logging in user...');
    const response = await this.request('/auth/v1/token', {
      method: 'POST',
      body: JSON.stringify({
        grant_type: 'password',
        email,
        password
      })
    });

    // Store access token for subsequent requests
    this.accessToken = response.data.access_token;
    console.log('Login successful');
    return response;
  }

  async getUser() {
    console.log('Fetching user profile...');
    const response = await this.request('/auth/v1/user');
    console.log('User profile:', response);
    return response;
  }

  async updateUser(userData) {
    console.log('Updating user profile...');
    const response = await this.request('/auth/v1/user', {
      method: 'PUT',
      body: JSON.stringify({
        data: userData
      })
    });
    console.log('Profile updated:', response);
    return response;
  }

  async sendMagicLink(email, redirectTo = null) {
    console.log('Sending magic link...');
    const body = { email };
    if (redirectTo) {
      body.data = { redirect_to: redirectTo };
    }

    const response = await this.request('/auth/v1/magiclink', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    console.log('Magic link sent:', response);
    return response;
  }

  async sendOTP(email, createUser = false) {
    console.log('Sending OTP...');
    const response = await this.request('/auth/v1/otp', {
      method: 'POST',
      body: JSON.stringify({
        email,
        create_user: createUser
      })
    });
    console.log('OTP sent:', response);
    return response;
  }

  async refreshToken(refreshToken) {
    console.log('Refreshing access token...');
    const response = await this.request('/auth/v1/token', {
      method: 'POST',
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    this.accessToken = response.data.access_token;
    console.log('Token refreshed successfully');
    return response;
  }

  async logout(scope = 'global') {
    console.log('Logging out user...');
    const response = await this.request(`/auth/v1/logout?scope=${scope}`, {
      method: 'POST'
    });
    console.log('Logout successful:', response);
    
    // Clear stored token
    this.accessToken = null;
    return response;
  }

  async recoverPassword(email) {
    console.log('Requesting password recovery...');
    const response = await this.request('/auth/v1/recover', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    console.log('Password recovery email sent:', response);
    return response;
  }

  getOAuthUrl(provider, scopes, redirectTo = null) {
    const params = new URLSearchParams({
      provider,
      scopes: scopes.join(' ')
    });

    if (redirectTo) {
      params.append('redirect_to', redirectTo);
    }

    return `${this.baseUrl}/auth/v1/authorize?${params}`;
  }
}

// Usage examples
async function runExamples() {
  if (!API_KEY) {
    console.error('Please set FRONTAL_API_KEY environment variable');
    process.exit(1);
  }

  const auth = new FrontalAuthAPI(API_KEY);
  const testEmail = 'user@example.com';
  const testPassword = 'securePassword123';

  try {
    // 1. Register a new user
    await auth.register(testEmail, testPassword, {
      first_name: 'John',
      last_name: 'Doe'
    });

    // 2. Login
    const loginResponse = await auth.login(testEmail, testPassword);
    const refreshToken = loginResponse.data.refresh_token;

    // 3. Get user profile
    await auth.getUser();

    // 4. Update user profile
    await auth.updateUser({
      first_name: 'John Updated',
      last_name: 'Doe Updated'
    });

    // 5. Send magic link
    await auth.sendMagicLink(testEmail, 'https://yourapp.com/callback');

    // 6. Send OTP
    await auth.sendOTP(testEmail, false);

    // 7. Refresh token
    await auth.refreshToken(refreshToken);

    // 8. Logout
    await auth.logout();

    // 9. Password recovery
    await auth.recoverPassword(testEmail);

    // 10. OAuth URL generation
    const googleOAuthUrl = auth.getOAuthUrl('google', ['email', 'profile']);
    console.log('Google OAuth URL:', googleOAuthUrl);

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('\n❌ Example failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { FrontalAuthAPI };

// Run examples if called directly
if (require.main === module) {
  runExamples();
}
