import React, { useEffect, useState } from 'react';
import { Button, FlatList, SafeAreaView, Text, View, StyleSheet, PermissionsAndroid, Platform, Alert } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import * as Location from 'expo-location';
import 'react-native-get-random-values'; 
import { v4 as uuidv4 } from 'uuid'; 

type ScannedDevice = {
  id: string;
  name: string | null;
};

const BluetoothScreen = () => {
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [bleManager] = useState(() => new BleManager());

  useEffect(() => {
    requestPermissions();
    return () => {
      bleManager.destroy();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      if (
        granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.log('Permissions granted');
      } else {
        Alert.alert('Permissions required', 'Bluetooth and location permissions are required to scan for devices.');
      }
    } else if (Platform.OS === 'ios') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is required to scan for devices.');
      }
    }
  };

  const startScan = () => {
    setIsScanning(true);
    setDevices([]); // Clear the list before starting a new scan
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error(error);
        setIsScanning(false);
        return;
      }
      // Use functional update to ensure the latest state
      setDevices((prevDevices) => {
        // Check if the device is already in the list
        if (device && !prevDevices.some((d) => d.id === device.id)) {
            const deviceName =
            device.name ||
            device.localName ||
            (device.manufacturerData ? `Device (${device.manufacturerData})` : 'Unnamed Device');
          const newDevice: ScannedDevice = {
            id: device.id,
            name: deviceName,
          };
          return [...prevDevices, newDevice]; // Add the new device
        }
        return prevDevices; // Return the previous state if the device is a duplicate
      });
    });
  };

  const stopScan = () => {
    bleManager.stopDeviceScan();
    setIsScanning(false);
  };

  const connectToDevice = async (deviceId: string) => {
    stopScan(); // Stop scanning before connecting
    try {
      const device = await bleManager.connectToDevice(deviceId);
      console.log('Connected to device:', device.name);
      const services = await device.discoverAllServicesAndCharacteristics();
      console.log('Services:', services);
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Bluetooth Devices</Text>
      <Button title={isScanning ? 'Stop Scan' : 'Start Scan'} onPress={isScanning ? stopScan : startScan} />
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id} // Use the device ID as the key
        renderItem={({ item }) => (
          <View style={styles.deviceItem}>
            <Text>{item.name || 'Unnamed Device'}</Text>
            <Text>{item.id}</Text>
            <Button title="Connect" onPress={() => connectToDevice(item.id)} />
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  deviceItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default BluetoothScreen;