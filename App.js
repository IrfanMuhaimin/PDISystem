// App.js
import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChecklistPage from './screens/ChecklistPage';
import SummaryPage from './screens/SummaryPage';
import { ChecklistProvider } from './context/ChecklistContext';
import InspectionPage from './screens/InspectionPage';
import QrPage from './screens/QrPage';
import InspectionSummaryPage from './screens/InspectionSummaryPage';
import Login from './screens/Login';
import MainPageStaff from './screens/MainPageStaff';
import MainPageSupervisor from './screens/MainPageSupervisor';
import { jwtDecode } from 'jwt-decode';
import RectifyQrPage from './screens/RectifyQrPage';
import RectifyChecklistPage from './screens/RectifyChecklistPage';
import RectifySummaryPage from './screens/RectifySummaryPage';
import InspectionInfoPage from './screens/InspectionInfo';
import { RectifyProvider } from './context/RectifyContext';
import SOP from './screens/SOP';
import { ActivityIndicator, View, Text } from 'react-native'; // Import ActivityIndicator, View, Text
import commonStyles, { COLORS } from './styles/commonStyles'; // Import common styles for loading

const Stack = createStackNavigator();

export default function App() {
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Function to check user authentication state
  const checkUser = useCallback(async () => {
    // setLoading(true); // Keep loading true until check is fully complete - Let initial state or caller manage this
    const token = await AsyncStorage.getItem('authToken');
    console.log("Checking user, token found:", !!token);
    if (token) {
      try {
        const decoded = jwtDecode(token);
        console.log('Token Decoded Content: ', decoded);
        console.log('User type from token:', decoded.type);
        if (decoded.type === 'Supervisor' || decoded.type === 'Staff') {
            setUserType(decoded.type);
            setIsAuthenticated(true);
            console.log('User authenticated.');
        } else {
             console.warn(`Invalid user type "${decoded.type}" in token. Logging out.`);
             await AsyncStorage.multiRemove(['authToken', 'userType']);
             setIsAuthenticated(false);
             setUserType(null);
        }
      } catch (error) {
        console.error('Invalid or expired token during checkUser:', error);
        await AsyncStorage.multiRemove(['authToken', 'userType']);
        setIsAuthenticated(false);
        setUserType(null);
      }
    } else {
      console.log('No token found, user not authenticated.');
      setIsAuthenticated(false);
      setUserType(null);
    }
    setLoading(false); // Finish loading AFTER all checks/state updates
  }, []);

  // Run checkUser on first load
  useEffect(() => {
    console.log("App mounted, running initial checkUser...");
    checkUser();
  }, [checkUser]);

  // Handle logout
  const handleLogout = async (navigation) => {
    console.log("Handling logout...");
    setLoading(true); // Show loading during logout transition
    await AsyncStorage.multiRemove(['authToken', 'userType']);
    setIsAuthenticated(false); // <-- State Change 1
    setUserType(null);         // <-- State Change 2
    // --- REMOVED NAVIGATION RESET ---
    // The state update above will cause App.js to re-render, and the conditional
    // navigator logic will automatically show the 'Login' screen.
    // navigation.reset({
    //   index: 0,
    //   routes: [{ name: 'Login' }],
    // });
    setLoading(false); // Hide loading
    console.log("Logout complete, state updated."); // Updated log message
  };

  // Handle Login Success
  const handleLoginSuccess = async (navigation) => {
    console.log("Handling login success...");
    setLoading(true); // Show loading while checking user
    await checkUser(); // Re-check user info after login to update state (this sets isAuthenticated=true)
    // No navigation reset needed here either.
    setLoading(false); // Hide loading
    console.log("Login success handled, state updated.");
  };

  if (loading) {
      // Show a simple loading indicator while checking auth state or logging in/out
      return (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
      );
  }

  console.log(`Rendering Navigator. isAuthenticated: ${isAuthenticated}, userType: ${userType}`);

  return (
    <ChecklistProvider>
      <RectifyProvider>
        <NavigationContainer>
          {/* Navigator structure remains the same */}
          <Stack.Navigator>
            {!isAuthenticated ? (
              // Render Login screen if not authenticated
              <Stack.Screen name="Login" options={{ headerShown: false }}>
                {/* Pass handleLoginSuccess correctly */}
                {props => <Login {...props} onLoginSuccess={() => handleLoginSuccess(props.navigation)} />}
              </Stack.Screen>
            ) : (
              // Render authenticated screens if authenticated
              <>
                <Stack.Screen name="Home" options={{ headerShown: false }}>
                  {props =>
                    // Conditionally render based on userType
                    userType === 'Supervisor' ? (
                      <MainPageSupervisor {...props} onLogout={() => handleLogout(props.navigation)} />
                    ) : userType === 'Staff' ? ( // Check specifically for Staff
                      <MainPageStaff {...props} onLogout={() => handleLogout(props.navigation)} />
                    ) : (
                       // Fallback if userType is somehow invalid after login
                       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text>Invalid User Type</Text></View>
                    )
                  }
                </Stack.Screen>
                {/* Other authenticated screens */}
                <Stack.Screen name="Qr" component={QrPage} options={{ headerShown: false }} />
                <Stack.Screen name="Checklist" component={ChecklistPage} options={{ headerShown: false }} />
                <Stack.Screen name="Summary" component={SummaryPage} options={{ headerShown: false }} />
                <Stack.Screen name="RectifyQr" component={RectifyQrPage} options={{ headerShown: false }} />
                <Stack.Screen name="RectifyChecklist" component={RectifyChecklistPage} options={{ headerShown: false }} />
                <Stack.Screen name="RectifySummary" component={RectifySummaryPage} options={{ headerShown: false }} />
                <Stack.Screen name="Inspection" component={InspectionPage} options={{ headerShown: false }} />
                <Stack.Screen name="InspectionSummary" component={InspectionSummaryPage} options={{ headerShown: false }} />
                <Stack.Screen name="InspectionInfo" component={InspectionInfoPage} options={{ headerShown: false }}/>
                <Stack.Screen name="SOP" component={SOP} options={{ headerShown: false }} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </RectifyProvider>
    </ChecklistProvider>
  );
}