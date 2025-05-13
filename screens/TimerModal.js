// TimerModal.js
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChecklistContext } from '../context/ChecklistContext'; // Import ChecklistContext

const TimerModal = ({ visible, onClose, carInfo }) => {
  const navigation = useNavigation();
  const { updateCarInfo } = useContext(ChecklistContext); // Get updateCarInfo from context
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);

  useEffect(() => {
    if (!visible) {
      // Reset timer when modal is closed
      setStartTime(null);
      setEndTime(null);
    }
  }, [visible]);

  const handleStart = () => {
    const now = new Date();
    updateCarInfo({ ...carInfo, startTime: now }); // Update startTime in context
    setStartTime(now); //set start time in local state
    navigation.navigate('Checklist');
    onClose(); // Close the modal after navigation
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Start PDI</Text>
          <Text>Model/Variant: {carInfo.model} / {carInfo.variant}</Text>
          <Text>Engine No: {carInfo.engine_no}</Text>
          <Text>Chassis No: {carInfo.chassis_no}</Text>
          <Text>Colour Code: {carInfo.colour_code}</Text>
          <Text>Entry Date: {carInfo.entry_date}</Text>
          <Text>Confirm to start PDI? Timer will start.</Text>

          {endTime ? (
            <>
              <Text>Start Time: {formatTime(startTime)}</Text>
              <Text>End Time: {formatTime(endTime)}</Text>
            </>
          ) : null}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
              <Text style={styles.startText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 100,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 23,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  closeButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 35,
    paddingVertical: 15,
    borderRadius: 5,
  },
  startButton: {
    backgroundColor: '#ef5b2d',
    paddingHorizontal: 35,
    paddingVertical: 15,
    borderRadius: 5,
  },
  closeText: {
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 18,
  },
  startText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 18,
  },
});

export default TimerModal;