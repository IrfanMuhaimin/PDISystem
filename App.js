// App.js
import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChecklistPage from './screens/ChecklistPage';
import SummaryPage from './screens/SummaryPage';
import InspectionPage from './screens/InspectionPage';
import QrPage from './screens/QrPage';
import InspectionSummaryPage from './screens/InspectionSummaryPage';
import Login from './screens/Login';
import MainPageStaff from './screens/MainPageStaff';
import MainPageSupervisor from './screens/MainPageSupervisor';
import RectifyQrPage from './screens/RectifyQrPage';
import RectifyChecklistPage from './screens/RectifyChecklistPage';
import RectifySummaryPage from './screens/RectifySummaryPage';
import InspectionInfoPage from './screens/InspectionInfo';
import SOP from './screens/SOP';
// PdfViewerScreen is removed as it's not directly navigated to from SOP anymore
// import PdfViewerScreen from './screens/PdfViewerScreen';

import { ActivityIndicator, View, Text } from 'react-native';
import { jwtDecode } from 'jwt-decode'; // Ensure 'jwt-decode' is installed

// Import Context Providers
import { ChecklistProvider } from './context/ChecklistContext'; // Ensure path is correct
import { RectifyProvider } from './context/RectifyContext'; // Ensure path is correct
import { DefectTypeProvider } from './context/defectTypeContext'; // Ensure path is correct

// Import Styles
import commonStyles, { COLORS } from './styles/commonStyles'; // Ensure path is correct

const Stack = createStackNavigator();

export default function App() {
    const [userType, setUserType] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Function to check user authentication state
    const checkUser = useCallback(async () => {
        const token = await AsyncStorage.getItem('authToken');
        console.log("Checking user, token found:", !!token);
        if (token) {
            try {
                // Ensure jwtDecode is imported correctly
                const decoded = jwtDecode(token);
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
        setLoading(false);
    }, []);

    // Run checkUser on first load
    useEffect(() => {
        console.log("App mounted, running initial checkUser...");
        checkUser();
    }, [checkUser]); // Dependency array includes checkUser

    // Handle logout
    const handleLogout = async (navigation) => {
        console.log("Handling logout...");
        setLoading(true); // Show loading briefly during state update
        await AsyncStorage.multiRemove(['authToken', 'userType']);
        setIsAuthenticated(false);
        setUserType(null);
        setLoading(false); // Hide loading
        console.log("Logout complete, state updated.");
        // No need to navigate, conditional rendering will show Login screen
    };

    // Handle Login Success
    const handleLoginSuccess = async (navigation) => {
        console.log("Handling login success...");
        setLoading(true); // Show loading while re-checking user
        await checkUser(); // Re-check user info to update state
        setLoading(false); // Hide loading
        console.log("Login success handled, state updated.");
        // No need to navigate, conditional rendering will show Home screen
    };

    // Loading Indicator UI
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    console.log(`Rendering Navigator. isAuthenticated: ${isAuthenticated}, userType: ${userType}`);

    return (
        // Providers wrapping NavigationContainer is also a common pattern
        <ChecklistProvider>
            <RectifyProvider>
                <DefectTypeProvider>
                    <NavigationContainer>
                        <Stack.Navigator>
                            {!isAuthenticated ? (
                                // Login Screen (Unauthenticated)
                                <Stack.Screen name="Login" options={{ headerShown: false }}>
                                    {props => <Login {...props} onLoginSuccess={() => handleLoginSuccess(props.navigation)} />}
                                </Stack.Screen>
                            ) : (
                                // Main App Screens (Authenticated)
                                <>
                                    <Stack.Screen name="Home" options={{ headerShown: false }}>
                                        {props =>
                                            userType === 'Supervisor' ? (
                                                <MainPageSupervisor {...props} onLogout={() => handleLogout(props.navigation)} />
                                            ) : userType === 'Staff' ? (
                                                <MainPageStaff {...props} onLogout={() => handleLogout(props.navigation)} />
                                            ) : (
                                                // Fallback if userType is somehow invalid after auth check
                                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                                    <Text>Error: Invalid User Type</Text>
                                                </View>
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
                                    <Stack.Screen name="InspectionInfo" component={InspectionInfoPage} options={{ headerShown: false }} />
                                    <Stack.Screen name="SOP" component={SOP} options={{ headerShown: false }} />
                                    {/* PdfViewerScreen removed from here */}
                                </>
                            )}
                        </Stack.Navigator>
                    </NavigationContainer>
                </DefectTypeProvider>
            </RectifyProvider>
        </ChecklistProvider>
    );
}