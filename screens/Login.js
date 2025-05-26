// screens/Login.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode"; // Ensure you have 'jwt-decode' installed

import ScreenWrapper from "../styles/flowstudiosbg.js";
import commonStyles, {
  COLORS,
  FONT_SIZES,
  PADDING,
  MARGIN,
} from "../styles/commonStyles";

const LOGIN_API_ENDPOINT = "http://pdi.flowstudios.com.my/api/login";
// Key for storing the logged-in username
const USERNAME_KEY = "currentUsername";

export default function Login({ navigation, onLoginSuccess }) {
  const [username, setUsername] = useState(""); // This is the username we'll store
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  let passwordInputRef = null;

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }
    setIsLoading(true);
    setError(null);
    let responseText = "";

    try {
      console.log(
        `Attempting login for user: ${username} to ${LOGIN_API_ENDPOINT}`
      );
      const response = await fetch(LOGIN_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `Login failed. Status: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || JSON.stringify(errorData);
        } catch (e) {
          /* Response not JSON */
        }
        throw new Error(errorMessage);
      }

      if (!responseText) {
        throw new Error("Login successful, but received no data from server.");
      }
      const data = JSON.parse(responseText);

      if (!data.token) {
        throw new Error(
          "Login failed: Authentication token missing in response."
        );
      }
      const decodedToken = jwtDecode(data.token);

      await AsyncStorage.setItem("authToken", data.token);
      await AsyncStorage.setItem("userType", decodedToken.type || "unknown");
      // Store the username
      await AsyncStorage.setItem(USERNAME_KEY, username);

      console.log("Login successful. Stored Token, UserType, and Username.");

      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      console.error("Login Error:", error);
      setError(error.message || "An unexpected error occurred.");
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
        onSubmitEditing={() => {
          passwordInputRef?.focus();
        }}
        returnKeyType="next"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        ref={(input) => {
          passwordInputRef = input;
        }}
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
        <Text
          style={[
            commonStyles.actionButtonText,
            localStyles.loginButtonTextSmall,
            isLoading ? commonStyles.actionButtonTextDisabled : {},
          ]}
        >
          {isLoading ? "Logging In..." : "Login"}
        </Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const localStyles = StyleSheet.create({
  content: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: PADDING.large,
  },
  title: {
    fontSize: FONT_SIZES.xxlarge,
    fontWeight: "bold",
    marginBottom: MARGIN.xlarge,
    color: COLORS.primary,
    textAlign: "center",
    width: "100%",
  },
  inputFullWidth: { width: "100%" },
  loadingIndicator: { marginVertical: MARGIN.small },
  errorText: {
    textAlign: "center",
    marginBottom: MARGIN.medium,
    marginTop: MARGIN.small,
    width: "100%",
    color: COLORS.danger,
  },
  loginButtonSmall: {
    marginTop: MARGIN.medium,
    paddingVertical: PADDING.medium,
    paddingHorizontal: PADDING.large + PADDING.medium,
  },
  loginButtonTextSmall: { fontSize: FONT_SIZES.large },
});
