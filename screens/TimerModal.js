import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChecklistContext } from '../context/ChecklistContext';
import commonStyles, { COLORS, FONT_SIZES, MARGIN, PADDING } from '../styles/commonStyles';

const TimerModal = ({ visible, onClose, carInfo }) => {
  const navigation = useNavigation();
  const { updateCarInfo } = useContext(ChecklistContext);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);

  useEffect(() => {
    if (!visible) {
      setStartTime(null);
      setEndTime(null);
    }
  }, [visible]);

  const handleStart = () => {
    const now = new Date();
    updateCarInfo({ ...carInfo, startTime: now });
    setStartTime(now);
    navigation.navigate('Checklist');
    onClose();
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
          <Text style={commonStyles.textRegular}>Model/Variant: {carInfo.model} / {carInfo.variant}</Text>
          <Text style={commonStyles.textRegular}>Engine No: {carInfo.engine_no}</Text>
          <Text style={commonStyles.textRegular}>Chassis No: {carInfo.chassis_no}</Text>
          <Text style={commonStyles.textRegular}>Colour Code: {carInfo.colour_code}</Text>
          <Text style={commonStyles.textRegular}>Entry Date: {carInfo.entry_date}</Text>
          <Text style={commonStyles.infoText}>Confirm to start PDI? Timer will start.</Text>

          {endTime && (
            <>
              <Text style={commonStyles.textRegular}>Start Time: {formatTime(startTime)}</Text>
              <Text style={commonStyles.textRegular}>End Time: {formatTime(endTime)}</Text>
            </>
          )}

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
    margin: MARGIN.large,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: PADDING.large + 5,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: MARGIN.medium,
    textAlign: 'center',
    fontSize: FONT_SIZES.large + 5,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: MARGIN.large,
  },
  closeButton: {
    backgroundColor: COLORS.veryLightGrey,
    paddingHorizontal: PADDING.buttonHorizontalOriginal,
    paddingVertical: PADDING.large,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: PADDING.buttonHorizontalOriginal,
    paddingVertical: PADDING.large,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: FONT_SIZES.large,
    color: COLORS.secondary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  startText: {
    fontSize: FONT_SIZES.large,
    color: COLORS.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default TimerModal;
