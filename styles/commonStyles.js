// styles/commonStyles.js
import { StyleSheet, Dimensions } from 'react-native';

// --- Reusable Theme Definitions ---
export const COLORS = { // <--- Already exported here
    primary: '#ef5b2d',
    primaryLight: '#ffe6cc',  // Used in original primary button bg
    secondary: '#333',       // Used in original button text color
    grey: '#555',
    lightGrey: '#ccc',
    veryLightGrey: '#f5f5f5', // Used in original secondary button bg
    white: '#fff',
    black: '#000',
    success: '#118B50',
    danger: '#b22222',
    warning: '#f39c12',
    info: '#3498db',
    disabled: '#cccccc',
    border: '#e0e0e0',
    divider: '#eee',
};

export const FONT_SIZES = { // <--- Already exported here
    xsmall: 12,
    small: 14,
    medium: 16,
    large: 18,
    xlarge: 25,  // Original button text size
    xxlarge: 28,
};

export const PADDING = { // <--- Already exported here
    xsmall: 4,
    small: 8,
    medium: 16, // Original container horizontal padding
    large: 20,  // Original button vertical padding
    xlarge: 24,
    buttonHorizontalOriginal: 50, // Specific original horizontal padding for buttons
};

export const MARGIN = { // <--- Already exported here
    xsmall: 4,
    small: 8,
    medium: 16,
    large: 20,
    xlarge: 24,
    footerVertical: 10, // Original top/bottom margin for container
};

// --- Shared Component Styles ---
const commonStyles = StyleSheet.create({
    // --- Layout ---
    safeAreaContainer: {
        flex: 1,
        backgroundColor: COLORS.veryLightGrey,
    },
    contentArea: {
        flex: 1,
        paddingHorizontal: PADDING.medium,
        paddingTop: PADDING.small,
        paddingBottom: PADDING.medium,
    },

    // --- Footer Action Buttons (Reverted to Original Style) ---
    footerActionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly', // Keeps buttons spaced out
        marginTop: MARGIN.footerVertical,    // Original margin top
        marginBottom: MARGIN.footerVertical, // Original margin bottom
        paddingHorizontal: PADDING.medium, // Original container padding
        // Removed borderTop, background defaults to parent or can be set if needed
        // backgroundColor: COLORS.white, // Optional: Set explicit background if needed
    },
    // Primary Action Button (Matches original 'buttonActionSummaryStyle')
    actionButton: {
        backgroundColor: COLORS.primaryLight,     // Original bg: #ffe6cc
        paddingHorizontal: PADDING.buttonHorizontalOriginal, // Original padding: 50
        paddingVertical: PADDING.large,           // Original padding: 20
        borderRadius: 5,                          // Original radius: 5
        alignItems: 'center',                     // Original alignment
        justifyContent: 'center',                 // Center text vertically
        // Removed minWidth, shadow - rely on padding for size
    },
    // Secondary/Back Action Button (Matches original 'buttonActionBackSummaryStyle')
    actionButtonSecondary: {
        backgroundColor: COLORS.veryLightGrey,    // Original bg: #f5f5f5
        paddingHorizontal: PADDING.buttonHorizontalOriginal, // Original padding: 50
        paddingVertical: PADDING.large,           // Original padding: 20
        borderRadius: 5,                          // Original radius: 5
        alignItems: 'center',                     // Original alignment
        justifyContent: 'center',                 // Center text vertically
        // Removed borderWidth, borderColor, minWidth
    },
    actionButtonText: {
        fontSize: FONT_SIZES.xlarge,              // Original size: 25
        fontWeight: 'bold',                       // Original weight
        textAlign: 'center',                      // Original align
        color: COLORS.secondary,                  // Original color: #333
    },
    // Keep these distinct in case text color needs to differ later
    actionButtonPrimaryText: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
        textAlign: 'center',
        color: COLORS.secondary, // Matches original
    },
    // Disabled styles should still use shared logic but match visual structure
     actionButtonDisabled: {
        backgroundColor: COLORS.disabled,
        // Match padding and radius of enabled state
        paddingHorizontal: PADDING.buttonHorizontalOriginal,
        paddingVertical: PADDING.large,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.7,
    },
    actionButtonTextDisabled: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        textAlign: 'center',
        color: COLORS.grey, // Dim text color when disabled
    },


    // --- Common Elements (Unchanged from previous version) ---
    pageHeader: {
        fontSize: FONT_SIZES.xxlarge,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: MARGIN.medium,
        color: COLORS.secondary,
    },
    textInput: {
        height: 48,
        borderColor: COLORS.lightGrey,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: MARGIN.medium,
        paddingHorizontal: PADDING.medium,
        backgroundColor: COLORS.white,
        fontSize: FONT_SIZES.medium,
        color: COLORS.secondary,
    },
    errorText: {
        color: COLORS.danger,
        textAlign: 'center',
        marginTop: MARGIN.large,
        fontSize: FONT_SIZES.medium,
        paddingHorizontal: PADDING.large,
    },
    noDataText: {
        color: COLORS.grey,
        textAlign: 'center',
        marginTop: MARGIN.large + MARGIN.large,
        fontSize: FONT_SIZES.medium,
        fontStyle: 'italic',
        paddingHorizontal: PADDING.large,
    },
    loadingIndicator: {
        marginTop: 50,
    },
    textRegular: {
        fontSize: FONT_SIZES.medium,
        color: COLORS.secondary,
    },
    textSmall: {
        fontSize: FONT_SIZES.small,
        color: COLORS.grey,
    },
    textBold: {
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
});

// Export the StyleSheet object as default for direct use
export default commonStyles;

// Constants are exported via `export const` declarations above