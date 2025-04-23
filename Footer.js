import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Footer = () => {
  return (
      <Text style={styles.footer}>PDI System. Copyright © Flow Studios, 2024</Text>
  );
};

const styles = StyleSheet.create({
  footer: {
    fontSize: 12,
    color: 'gray',
    textAlign: 'center', // Center the text horizontally
    marginBottom: 20,
  },
});

export default Footer;