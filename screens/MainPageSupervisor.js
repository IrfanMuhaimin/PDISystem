// screens/MainPageSupervisor.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// --- Import ScreenWrapper ---
import ScreenWrapper from '../styles/flowstudiosbg.js';

// --- Import Common Styles & Constants ---
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

// Define specific sizes for this page's buttons
const LARGE_BUTTON_FONT_SIZE = 30;
const LARGE_BUTTON_V_PADDING = 40;
const LARGE_BUTTON_MARGIN = 60;

export default function MainPageSupervisor({ navigation, onLogout }) {
  return (
    // Use ScreenWrapper
    <ScreenWrapper
      showHeader={true}
      showFooter={true}
      contentStyle={localStyles.content}
      enableKeyboardAvoidingView={false}
      enableScrollView={false}
    >
      {/* The content (buttons) */}

      <TouchableOpacity style={localStyles.menuButton} onPress={() => navigation.navigate('Qr')}>
        <Text style={localStyles.menuButtonText}>PDI</Text>
      </TouchableOpacity>

      <TouchableOpacity style={localStyles.menuButton} onPress={() => navigation.navigate('RectifyQr')}>
        <Text style={localStyles.menuButtonText}>Rectify</Text>
      </TouchableOpacity>

      <TouchableOpacity style={localStyles.menuButton} onPress={() => navigation.navigate('Inspection')}>
        <Text style={localStyles.menuButtonText}>Final Inspection</Text>
      </TouchableOpacity>

      <TouchableOpacity style={localStyles.menuButton} onPress={() => navigation.navigate('SOP')}>
        <Text style={localStyles.menuButtonText}>SOP</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={[localStyles.menuButton, localStyles.logoutButton]} // Combine styles
        onPress={onLogout}
      >
        <Text style={localStyles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

    </ScreenWrapper>
  );
}

// --- Local Styles ---
const localStyles = StyleSheet.create({
    content: { // Passed to ScreenWrapper's contentStyle
        flex: 1,
        justifyContent: 'center', // Center buttons vertically
        alignItems: 'center',
        width: '50%', // Keep 50% width
        alignSelf: 'center',
    },
    menuButton: {
        backgroundColor: COLORS.primaryLight, // Use theme color
        paddingVertical: LARGE_BUTTON_V_PADDING, // Keep large padding
        marginBottom: LARGE_BUTTON_MARGIN, // Keep large margin
        alignItems: 'center',
        alignSelf: 'stretch', // Make button fill the 50% width
        borderRadius: 5,
    },
    menuButtonText: {
        fontSize: LARGE_BUTTON_FONT_SIZE,
        fontWeight: 'bold',
        color: COLORS.secondary, // Use theme color
    },
    logoutButton: {
        backgroundColor: COLORS.danger, // Use theme color for logout
    },
    logoutButtonText: {
        color: COLORS.white, // White text on danger background
        fontSize: LARGE_BUTTON_FONT_SIZE,
        fontWeight: 'bold',
    },
});