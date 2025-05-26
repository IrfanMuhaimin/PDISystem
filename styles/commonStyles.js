// styles/commonStyles.js
import { StyleSheet, Dimensions } from 'react-native';

// --- Reusable Theme Definitions ---
export const COLORS = {
    primary: '#ef5b2d',
    primaryLight: '#ffe6cc',
    secondary: '#333',
    grey: '#555', // Used for disabled text, original #888888 was similar
    lightGrey: '#ccc',
    veryLightGrey: 'rgba(245, 245, 245, 0.8)', // Matches original item background #f8f8f8 closely
    white: '#fff',
    black: '#000',
    success: '#118B50', // Matches 'green'
    danger: '#b22222', // Matches 'red'
    warning: '#f39c12',
    info: '#3498db',
    disabled: '#cccccc',
    border: '#e0e0e0',
    divider: '#eee',
    redinfo: 'rgba(250,0,0,0.15)',
    footer: 'transparent'
};

export const FONT_SIZES = {
    xsmall: 12,
    small: 14,
    medium: 16,   // Matches original carInfo, itemName
    large: 18,   // Close to original subHeader (20)
    xlarge: 25,  // Matches original buttonText, sectionTitle
    xxlarge: 28, // Close to original header (30)
    headerLarge: 30, // Explicit size for ChecklistPage header if needed
};

export const PADDING = {
    xsmall: 4,
    small: 8,
    medium: 16, // Original container horizontal padding, also good for list items
    large: 20,  // Original button vertical padding
    xlarge: 24,
    buttonHorizontalOriginal: 50, // Specific original horizontal padding for buttons
    listItem: 10, // Matches original item padding
};

export const MARGIN = {
    xsmall: 4,
    small: 8,    // Good for between carInfo lines, item vertical margin (5)
    medium: 16,  // Good for section bottom margin (10), header bottom (5)
    large: 20,   // Good for subHeader bottom (20)
    xlarge: 24,
    footerVertical: 10, // Original top/bottom margin for container
    sectionHeaderBottom: 20, // Explicit margin for section header
    sectionLeft: 16, // Explicit left margin for section content
};

// --- Shared Component Styles ---
const commonStyles = StyleSheet.create({
    // --- Layout ---
    safeAreaContainer: {
        flex: 1,
        backgroundColor: COLORS.veryLightGrey, // Changed default background slightly
    },
    contentArea: {
        flex: 1,
        paddingHorizontal: PADDING.medium,
        paddingTop: PADDING.small,
        paddingBottom: PADDING.medium,
        backgroundColor: 'transparent', // Ensure content area is transparent by default
    },
    scrollViewContainer: { // Style for ScrollView component itself
        flex: 1,
        backgroundColor: 'transparent',
    },

    // --- Footer Action Buttons (Existing - Check if matches ChecklistPage) ---
    // Original footerActionContainer, actionButton, actionButtonSecondary, actionButtonText,
    // actionButtonDisabled, actionButtonTextDisabled seem to match ChecklistPage's footer/button styles.
    // No changes needed here based on ChecklistPage footer styles.
    footerActionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginTop: MARGIN.footerVertical,
        marginBottom: MARGIN.footerVertical,
        paddingHorizontal: PADDING.medium,
         // backgroundColor: COLORS.white, // Optional: Keep background explicit if needed
    },
    actionButton: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: PADDING.buttonHorizontalOriginal,
        paddingVertical: PADDING.large,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonSecondary: {
        backgroundColor: COLORS.veryLightGrey,
        paddingHorizontal: PADDING.buttonHorizontalOriginal,
        paddingVertical: PADDING.large,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
        textAlign: 'center',
        color: COLORS.secondary,
    },
    actionButtonPrimaryText: { // Keep distinct in case needed
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
        textAlign: 'center',
        color: COLORS.secondary,
    },
    actionButtonDisabled: {
        backgroundColor: COLORS.disabled, // Matches #cccccc
        paddingHorizontal: PADDING.buttonHorizontalOriginal,
        paddingVertical: PADDING.large,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.7,
    },
    actionButtonTextDisabled: {
        fontSize: FONT_SIZES.xlarge, // Match enabled size
        textAlign: 'center',
        color: COLORS.grey, // Use theme grey (original #888888 was darker grey)
    },
    actionButtonModalDisabled: {
        fontSize: FONT_SIZES.large, // Match enabled size
        textAlign: 'center',
        color: COLORS.grey, // Use theme grey (original #888888 was darker grey)
    },

    // --- Common Text Styles ---
    pageHeader: {
        fontSize: FONT_SIZES.headerLarge,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: MARGIN.small,
    },
    subHeaderText: {
        fontSize: FONT_SIZES.large,
        textAlign: 'center',
        marginBottom: MARGIN.large,
        color: COLORS.secondary,
    },
    infoText: {
        fontSize: FONT_SIZES.medium,
        textAlign: 'center',
        marginBottom: MARGIN.small,
        color: COLORS.secondary,
    },
     sectionHeaderText: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    listItemText: { 
        flex: 1,
        fontSize: FONT_SIZES.medium,
        color: COLORS.secondary,
        marginRight: MARGIN.small, // Space before checkboxes/actions
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
    // Base text styles (keep existing)
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

    // --- Common Container Styles ---
    listItemContainer: { // NEW: General style for list items
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.veryLightGrey, // Matches original #f8f8f8 closely
        padding: PADDING.listItem, // Matches original 10
        marginVertical: MARGIN.small / 2, // Matches original 5
        borderRadius: 5, // Matches original
        // Removed marginRight: MARGIN.medium (handle spacing in parent/section)
    },

    // --- Other Common Elements ---
    loadingIndicator: {
        marginTop: 50,
    },
    textInput: { // Keep existing TextInput style
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
});
export default commonStyles;