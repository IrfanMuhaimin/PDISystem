// screens/MainPageSupervisor.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ScreenWrapper from '../styles/flowstudiosbg.js';
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

const LARGE_BUTTON_FONT_SIZE = 30;
const LARGE_BUTTON_V_PADDING = 40;
const LARGE_BUTTON_MARGIN = 60;

export default function MainPageSupervisor({ navigation, onLogout }) {
  return (

    <ScreenWrapper
      showHeader={true}
      showFooter={true}
      contentStyle={localStyles.content}
      enableKeyboardAvoidingView={false}
      enableScrollView={false}
    >

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
      <TouchableOpacity style={[localStyles.menuButton, localStyles.logoutButton]}
        onPress={onLogout}
      >
        <Text style={localStyles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

    </ScreenWrapper>
  );
}

// --- Local Styles ---
const localStyles = StyleSheet.create({
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '50%',
        alignSelf: 'center',
    },
    menuButton: {
        backgroundColor: COLORS.primaryLight,
        paddingVertical: LARGE_BUTTON_V_PADDING,
        marginBottom: LARGE_BUTTON_MARGIN,
        alignItems: 'center',
        alignSelf: 'stretch',
        borderRadius: 5,
    },
    menuButtonText: {
        fontSize: LARGE_BUTTON_FONT_SIZE,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    logoutButton: {
        backgroundColor: COLORS.danger,
    },
    logoutButtonText: {
        color: COLORS.white,
        fontSize: LARGE_BUTTON_FONT_SIZE,
        fontWeight: 'bold',
    },
});