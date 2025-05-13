// styles/flowstudiosbg.js
import React from 'react';
import {
    View,
    SafeAreaView,
    Image,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    // Text // Import Text in case we need to wrap intentional space later
} from 'react-native';

// --- Correct these paths if necessary ---
import Footer from '../Footer';
import Header from '../Header';
import commonStyles, { COLORS } from './commonStyles.js';
const backgroundImageSource = require('../assets/flowstudios.png');
// -----------------------------------------

const ScreenWrapper = ({
  children,
  showHeader = true,
  showFooter = true,
  showImageBackground = true,
  showOverlay = true,
  imageResizeMode = 'contain',
  imageStyle,
  style,
  contentStyle,
  enableKeyboardAvoidingView = true,
  enableScrollView = false,
}) => {

  // renderContent function with explicit nulls/removed whitespace
  const renderContent = () => (
    <>
      {showHeader && <Header />}
      {/* Explicitly render nothing between header and content block */}
      {null}
      {enableKeyboardAvoidingView ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingContainer}
        >
          {enableScrollView ? (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[styles.contentAreaBase, contentStyle]}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.contentAreaBase, contentStyle]}>{children}</View>
          )}
        </KeyboardAvoidingView>
      ) : enableScrollView ? (
          <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[styles.contentAreaBase, contentStyle]}
              keyboardShouldPersistTaps="handled"
          >
              {children}
          </ScrollView>
      ) : (
          <View style={[styles.contentAreaBase, contentStyle]}>{children}</View>
      )}
      {/* Explicitly render nothing between content block and footer */}
      {null}
      {showFooter && <Footer />}
    </>
  );

  // Main return statement with explicit nulls/removed whitespace
  return (
    <SafeAreaView style={[commonStyles.safeAreaContainer, style]}>
      {showImageBackground && (
        <Image
          source={backgroundImageSource}
          style={[styles.absoluteImage, imageStyle]}
          resizeMode={imageResizeMode}
        />
      )}
      {/* Explicitly render nothing between elements */}
      {null}
      {showOverlay && (
        <View style={styles.absoluteOverlay} />
      )}
      {/* Explicitly render nothing between elements */}
      {null}
      <View style={styles.contentContainer}>
        {/* Explicitly render nothing before content */}
        {null}
        {renderContent()}
        {/* Explicitly render nothing after content */}
        {null}
      </View>
      {/* Explicitly render nothing after content container */}
      {null}
    </SafeAreaView>
  );
};

// --- StyleSheet (Unchanged from previous version) ---
const styles = StyleSheet.create({
  absoluteImage: {
    position: 'absolute',
    top: 600,
    left: 270,
    width: '70%',
    height: '70%',
    // resizeMode is applied via prop
  },
  absoluteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Example overlay
  },
  contentContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  noBackgroundContainer: {
    flex: 1,
    backgroundColor: COLORS.veryLightGrey,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollView: {
      flex: 1,
      backgroundColor: 'transparent',
  },
  contentAreaBase: {
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
});
// --- End of StyleSheet ---

export default ScreenWrapper;