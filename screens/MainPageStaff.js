// screens/MainPageStaff.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'; // Removed SafeAreaView

// --- Import ScreenWrapper ---
// *** ADJUST PATH IF NEEDED ***
import ScreenWrapper from '../styles/flowstudiosbg.js';

// --- Import Common Styles & Constants ---
// *** ADJUST PATH IF NEEDED ***
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

// Define specific sizes for this page's buttons (can be same as Supervisor or different)
const LARGE_BUTTON_FONT_SIZE = 30; // Keep original large size
const LARGE_BUTTON_V_PADDING = 40; // Keep original large padding
const LARGE_BUTTON_MARGIN = 60;    // Keep original large margin

export default function MainPageStaff({ navigation, onLogout }) {
  return (
    // Use ScreenWrapper, show Header and Footer by default
    <ScreenWrapper
      showHeader={true}
      showFooter={true}
      contentStyle={localStyles.content} // Apply local centering/width style
      enableKeyboardAvoidingView={false} // No inputs
      enableScrollView={false} // Content fits screen
    >
      {/* Buttons are children of ScreenWrapper */}

      <TouchableOpacity style={localStyles.menuButton} onPress={() => navigation.navigate('Qr')}>
        <Text style={localStyles.menuButtonText}>PDI</Text>
      </TouchableOpacity>

      <TouchableOpacity style={localStyles.menuButton} onPress={() => navigation.navigate('RectifyQr')}>
        <Text style={localStyles.menuButtonText}>Rectify</Text>
      </TouchableOpacity>

      <TouchableOpacity style={localStyles.menuButton} onPress={() => navigation.navigate('SOP')}>
        <Text style={localStyles.menuButtonText}>SOP</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity
        style={[localStyles.menuButton, localStyles.logoutButton]} // Combine base + logout specific style
        onPress={onLogout}
      >
        {/* Use specific text style for logout for potential color override */}
        <Text style={localStyles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

    </ScreenWrapper>
  );
}

// --- Local Styles ---
// Styles specific to this Staff Menu page
const localStyles = StyleSheet.create({
    content: { // Passed to ScreenWrapper's contentStyle
        flex: 1, // Fill space between Header/Footer
        justifyContent: 'center', // Center buttons vertically
        alignItems: 'center', // Center buttons horizontally within the 50% width
        width: '50%', // Keep the 50% width column effect
        alignSelf: 'center', // Center the 50% column itself
    },
    menuButton: {
        backgroundColor: COLORS.primaryLight, // Use theme color
        paddingVertical: LARGE_BUTTON_V_PADDING, // Use defined large padding
        marginBottom: LARGE_BUTTON_MARGIN, // Use defined large margin
        alignItems: 'center', // Center text inside button
        alignSelf: 'stretch', // Make button stretch to container width (50% of screen)
        borderRadius: 5, // Keep original radius
    },
    menuButtonText: {
        fontSize: LARGE_BUTTON_FONT_SIZE, // Use defined large font size
        fontWeight: 'bold',
        color: COLORS.secondary, // Use theme text color
    },
    logoutButton: {
        // Override background for logout button
        backgroundColor: COLORS.danger, // Use theme danger color
    },
    logoutButtonText: {
        // Define specific text style for logout button
        fontSize: LARGE_BUTTON_FONT_SIZE, // Match other buttons
        fontWeight: 'bold',
        color: COLORS.white, // Ensure white text on red background
    },
    // Removed original container, appBar, appBarTitle, button, buttonText styles
});