import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../ThemeContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot, setDoc, collection, query } from 'firebase/firestore';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function Profile({ createCircle, joinCircle, navigation }) {
  const { isDarkMode, toggleTheme, theme } = useContext(ThemeContext);
  const [userData, setUserData] = useState({});
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isJoinModalVisible, setJoinModalVisible] = useState(false);
  const [circleInput, setCircleInput] = useState('');

  // Initialize the Google Auth Hook
  // Initialize the Google Auth Hook
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '121807512209-livre17ccveevui1oa80ukovmeqco6pr.apps.googleusercontent.com',
    iosClientId: '121807512209-livre17ccveevui1oa80ukovmeqco6pr.apps.googleusercontent.com',
    androidClientId: '121807512209-livre17ccveevui1oa80ukovmeqco6pr.apps.googleusercontent.com',
    webClientId: '121807512209-livre17ccveevui1oa80ukovmeqco6pr.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    extraParams: { access_type: 'offline' },
    // This MUST perfectly match the Authorized redirect URI in Google Cloud
    redirectUri: 'https://auth.expo.io/@pauldvngrc/syncgrid'
  });

  // Listen for the redirect response from the browser
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      
      // Save the tokens to Firestore
      const saveTokens = async () => {
        try {
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'secure_credentials', 'google'), {
            accessToken: authentication.accessToken,
            refreshToken: authentication.refreshToken, // This might be null if Google doesn't send it, but we requested 'offline' access.
            expiresAt: Date.now() + (authentication.expiresIn * 1000),
            clientId: '121807512209-livre17ccveevui1oa80ukovmeqco6pr.apps.googleusercontent.com',
            clientSecret: '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' // Storing this here for the backend service to use
          }, { merge: true });
          
          Alert.alert("Success", "Google Calendar Linked! SyncGrid will now pull your events.");
          
          // Next step: We'll trigger the CalendarSyncService here later!
          
        } catch (error) {
          console.error("Error saving tokens:", error);
          Alert.alert("Error", "Failed to link Google account.");
        }
      }
      
      saveTokens();
    }
  }, [response]);

  // Real-time listener for the user's profile data
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        setUserData({});
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'notifications')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreadExists = snapshot.docs.some(
        doc => doc.data().read === false
      );

      setHasUnreadNotifications(unreadExists);
    });

    return unsubscribe;
  }, []);

  const handleCreateCircle = () => setCreateModalVisible(true);
  const handleJoinCircle = () => setJoinModalVisible(true);

  const submitCreate = () => {
    if (createCircle && circleInput) createCircle(circleInput);
    setCreateModalVisible(false);
    setCircleInput('');
  };

  const submitJoin = () => {
    if (joinCircle && circleInput) joinCircle(circleInput.toUpperCase());
    setJoinModalVisible(false);
    setCircleInput('');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* DYNAMIC HEADER (NOW CLICKABLE) */}
      <TouchableOpacity 
        style={[styles.profileHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
        onPress={() => navigation.navigate('EditProfile')}
        activeOpacity={0.7}
      >
        <Image 
          source={{ uri: userData.avatar || 'https://ui-avatars.com/api/?name=User&background=ccc&color=fff' }} 
          style={styles.profileImage} 
        />
        <View style={styles.profileInfo}>
          <Text style={[styles.userName, { color: theme.text }]}>{userData.name || 'Set up your profile'}</Text>
          <Text style={[styles.userBio, { color: theme.subText }]}>{userData.bio || 'Tap to edit your bio'}</Text>
          
          {(userData.gender || userData.nationality) && (
            <Text style={{ color: theme.subText, fontSize: 12, marginTop: 4, fontWeight: '500' }}>
              {[userData.gender, userData.nationality].filter(Boolean).join(' • ')}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.border} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={handleCreateCircle}>
          <Ionicons name="add-circle-outline" size={24} color="#00E676" />
          <Text style={[styles.menuText, { color: theme.text, fontWeight: 'bold' }]}>Create New Circle</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.border} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={handleJoinCircle}>
          <Ionicons name="enter-outline" size={24} color="#2196F3" />
          <Text style={[styles.menuText, { color: theme.text, fontWeight: 'bold' }]}>Join a Circle</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.border} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: theme.card }]}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="person-circle-outline" size={24} color={theme.subText} />
          <Text style={[styles.menuText, { color: theme.text }]}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.border} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: theme.card }]}
          onPress={() => navigation.navigate('Notifications')}
        >
          <View style={{ position: 'relative' }}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={theme.subText}
            />

            {hasUnreadNotifications && (
              <View
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#FF3B30',
                  borderWidth: 1,
                  borderColor: theme.card
                }}
              />
            )}
          </View>

          <Text style={[styles.menuText, { color: theme.text }]}>
            Notifications Feed
          </Text>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.border}
          />
        </TouchableOpacity>
        
        {/* Replace your current Privacy button with this: */}
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: theme.card }]}
          onPress={() => navigation.navigate('Privacy')}
        >
          <Ionicons name="lock-closed-outline" size={24} color={theme.subText} />
          <Text style={[styles.menuText, { color: theme.text }]}>Privacy Settings</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.border} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Preferences</Text>
        
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={toggleTheme}>
          <Ionicons name={isDarkMode ? "moon" : "color-palette-outline"} size={24} color={isDarkMode ? "#007bff" : theme.subText} />
          <Text style={[styles.menuText, { color: theme.text }]}>Dark Mode</Text>
          <View style={[styles.statusBadge, { backgroundColor: isDarkMode ? '#333' : '#eee' }]}>
            <Text style={[styles.statusText, { color: isDarkMode ? '#fff' : '#555' }]}>{isDarkMode ? 'ON' : 'OFF'}</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: theme.card }]} 
          disabled={!request}
          onPress={() => promptAsync()}
        >
          <Ionicons name="sync-outline" size={24} color="#4285F4" />
          <Text style={[styles.menuText, { color: theme.text, fontWeight: 'bold' }]}>Sync Google Calendar</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.border} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.logoutBtn, { backgroundColor: isDarkMode ? '#331111' : '#ffebee' }]}
        onPress={() => signOut(auth)}
      >
        <Text style={[styles.logoutText, { color: isDarkMode ? '#ff4444' : '#d32f2f' }]}>Log Out</Text>
      </TouchableOpacity>
      {/* --- ANDROID COMPATIBLE MODALS --- */}
      <Modal visible={isCreateModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Circle</Text>
            <Text style={{ color: theme.subText, marginBottom: 15 }}>Enter a name for your new group:</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Circle Name"
              placeholderTextColor={theme.subText}
              value={circleInput}
              onChangeText={setCircleInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => { setCreateModalVisible(false); setCircleInput(''); }} style={{ padding: 10 }}>
                <Text style={{ color: theme.subText, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitCreate} style={{ padding: 10 }}>
                <Text style={{ color: '#00E676', fontSize: 16, fontWeight: 'bold' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isJoinModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Join Circle</Text>
            <Text style={{ color: theme.subText, marginBottom: 15 }}>Enter the 6-digit invite code:</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. A1B2C3"
              placeholderTextColor={theme.subText}
              value={circleInput}
              onChangeText={setCircleInput}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => { setJoinModalVisible(false); setCircleInput(''); }} style={{ padding: 10 }}>
                <Text style={{ color: theme.subText, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitJoin} style={{ padding: 10 }}>
                <Text style={{ color: '#2196F3', fontSize: 16, fontWeight: 'bold' }}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  profileImage: { width: 70, height: 70, borderRadius: 35, marginRight: 15, backgroundColor: '#eee' },
  profileInfo: { flex: 1, justifyContent: 'center' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  userBio: { fontSize: 14, color: '#666', marginTop: 4 },
  section: { marginTop: 25, paddingHorizontal: 15 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 8 },
  menuText: { flex: 1, fontSize: 16, color: '#333', marginLeft: 15 },
  statusBadge: { backgroundColor: '#eee', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  logoutBtn: { margin: 30, backgroundColor: '#ffebee', padding: 15, borderRadius: 10, alignItems: 'center' },
  logoutText: { color: '#d32f2f', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', padding: 20, borderRadius: 10, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
});