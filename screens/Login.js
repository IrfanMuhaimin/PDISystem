// screens/Login.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

// --- Import NEW ScreenWrapper from its new location ---
import ScreenWrapper from '../styles/flowstudiosbg.js'; // Points to the file containing ScreenWrapper

// --- Import Shared Styles & Constants ---
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

const LOGIN_API_ENDPOINT = 'http://pdi.flowstudios.com.my/api/login';

export default function Login({ navigation, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  let passwordInputRef = null;

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setIsLoading(true);
    setError(null);
    let responseText = ''; // Define responseText outside try block to access in catch

    try {
      console.log(`Attempting login for user: ${username} to ${LOGIN_API_ENDPOINT}`);
      const response = await fetch(LOGIN_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      // --- Read the response body as text FIRST ---
      responseText = await response.text(); // <-- Read text first
      // -------------------------------------------

      if (!response.ok) {
         // Attempt to parse error from the ACTUAL responseText
         let errorMessage = `Login failed. Status: ${response.status} ${response.statusText}`;
         try {
            // Now responseText contains the actual server response
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || JSON.stringify(errorData);
         } catch (e) {
            console.log("Response body was not valid JSON (likely HTML error page or empty).");
         }
         throw new Error(errorMessage); // Throw based on status or parsed server error message
      }

      // If response.ok IS true, THEN attempt to parse the ACTUAL responseText as JSON
      if (!responseText) {
        console.warn("Server returned a successful status but an empty response body.");
        throw new Error("Login successful, but received no data from server."); // Or handle differently
      }
      const data = JSON.parse(responseText); // Now parses the actual response

      if (!data.token) {
        console.error("Login successful response but no token found:", data);
        throw new Error('Login failed: Authentication token missing in response.');
      }
      const decodedToken = jwtDecode(data.token);
      if (!decodedToken.type) {
        console.warn("Decoded token is missing 'type' property:", decodedToken);
      }
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('userType', decodedToken.type || 'unknown'); 
      console.log('Login successful. Stored Token:', data.token);
      console.log('Stored User Type:', decodedToken.type || 'unknown');
      if (onLoginSuccess) {
        onLoginSuccess(); 
      }
    } catch (error) {
      console.error('Login Error:', error);
      setError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper
        showHeader={true}
        showFooter={true}
        contentStyle={localStyles.content}
        enableKeyboardAvoidingView={true}
        enableScrollView={false}
    >
        <Text style={localStyles.title}>Login</Text>

        <TextInput
            style={[commonStyles.textInput, localStyles.inputFullWidth]}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            placeholderTextColor={COLORS.lightGrey}
            editable={!isLoading}
            onSubmitEditing={() => { passwordInputRef?.focus(); }}
            returnKeyType="next"
            autoCapitalize="none"
            autoCorrect={false}
        />

        <TextInput
            ref={(input) => { passwordInputRef = input; }}
            style={[commonStyles.textInput, localStyles.inputFullWidth]}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={COLORS.lightGrey}
            editable={!isLoading}
            onSubmitEditing={handleLogin}
            returnKeyType="go"
            autoCapitalize="none"
            autoCorrect={false}
        />

        {/* Error Message Display */}
        {error && !isLoading && (
            <Text style={[commonStyles.errorText, localStyles.errorText]}>
            {error}
            </Text>
        )}

        {isLoading && (
            <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={localStyles.loadingIndicator}
            />
        )}

        <TouchableOpacity
            style={[
            commonStyles.actionButton,
            localStyles.loginButtonSmall,
            isLoading ? commonStyles.actionButtonDisabled : {},
            ]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.7}
        >
            <Text style={[
                commonStyles.actionButtonText,
                localStyles.loginButtonTextSmall,
                isLoading ? commonStyles.actionButtonTextDisabled : {}
            ]}>
            {isLoading ? 'Logging In...' : 'Login'}
            </Text>
        </TouchableOpacity>
    </ScreenWrapper>
  );
}

const localStyles = StyleSheet.create({
    content: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: PADDING.large,
    },
    title: {
        fontSize: FONT_SIZES.xxlarge,
        fontWeight: 'bold',
        marginBottom: MARGIN.xlarge,
        color: COLORS.primary,
        textAlign: 'center',
        width: '100%',
    },
    inputFullWidth: {
        width: '100%',
    },
    loadingIndicator: {
      marginVertical: MARGIN.small,
    },
    errorText: {
      textAlign: 'center',
      marginBottom: MARGIN.medium,
      marginTop: MARGIN.small,
      width: '100%',
      color: COLORS.danger,
    },
    loginButtonSmall: {
      marginTop: MARGIN.xlarge,
      paddingVertical: PADDING.large,
      paddingHorizontal: PADDING.xlarge + PADDING.large,
    },
    loginButtonTextSmall: {
       fontSize: FONT_SIZES.large,
    }
});