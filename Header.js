// Header.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Header = () => {
  return (
    <View style={styles.appBar}>
      <Text style={styles.appBarTitle}>PDI System</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  appBar: {
    height: 60,
    backgroundColor: '#ef5b2d',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 30,
    width: '100%',
  },
  appBarTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default Header;