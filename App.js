import React, { useState, useContext, createContext } from 'react';
import { TouchableOpacity, StatusBar, Alert, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from './ThemeContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

import AuthScreen from './screens/AuthScreen';
import Dashboard from './screens/Dashboard';
import ListView from './screens/ListView';
import AddSchedule from './screens/AddSchedule';
import Profile from './screens/Profile'; 
import CircleChat from './screens/CircleChat';
import EditProfile from './screens/EditProfile';
import Notifications from './screens/Notifications';
import Privacy from './screens/Privacy';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MY_AVATAR = 'https://ui-avatars.com/api/?name=Me'; 

// 1. CREATE AN INTERNAL CONTEXT TO BYPASS INLINE NAVIGATOR PROPS
const AppContext = createContext();

// 2. CREATE STATIC WRAPPERS FOR SCREENS (Prevents Unmount/Remount Lag)
const HeatmapWrapper = (props) => {
  const state = useContext(AppContext);
  const activeSchedules = state.schedules.filter(s => s.groupId === state.activeGroupId);
  return <Dashboard {...props} {...state} schedules={activeSchedules} />;
};

const ListWrapper = (props) => {
  const state = useContext(AppContext);
  const activeSchedules = state.schedules.filter(s => s.groupId === state.activeGroupId);
  return <ListView {...props} {...state} schedules={activeSchedules} />;
};

const ProfileWrapper = (props) => {
  const state = useContext(AppContext);
  return <Profile {...props} {...state} />;
};

const AddScheduleWrapper = (props) => {
  const state = useContext(AppContext);
  return <AddSchedule {...props} addSchedule={state.addSchedule} />;
};

// 3. REBUILT MAIN TABS: NO INLINE FUNCTIONS
function MainTabs() {
  const { theme, hasUnreadMessages, hasUnreadNotifications } = useContext(AppContext);

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Heatmap') iconName = focused ? 'grid' : 'grid-outline';
          if (route.name === 'List') iconName = focused ? 'list' : 'list-outline';
          if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

          const showDot =
            (route.name === 'Heatmap' && hasUnreadMessages) ||
            (route.name === 'Profile' && hasUnreadNotifications);

          return (
            <View style={{ position: 'relative' }}>
              <Ionicons name={iconName} size={size} color={color} />
              {showDot && (
                <View
                  style={{
                    position: 'absolute',
                    top: -1,
                    right: -6,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#FF3B30',
                    borderWidth: 1.5,
                    borderColor: theme.card
                  }}
                />
              )}
            </View>
          );
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: 5, height: 60, backgroundColor: theme.card, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.card, borderBottomColor: theme.border, shadowColor: 'transparent', elevation: 0 },
        headerTintColor: theme.text,
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.navigate('AddSchedule')} style={{ marginRight: 15 }}>
            <Ionicons name="add-circle" size={28} color="#007bff" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Heatmap" component={HeatmapWrapper} options={{ title: 'SyncGrid' }} />
      <Tab.Screen name="List" component={ListWrapper} options={{ title: 'Routines' }} />
      <Tab.Screen name="Profile" component={ProfileWrapper} options={{ title: 'Settings', headerRight: null }} />
    </Tab.Navigator>
  );
}

// ==========================================
// CORE APP ENGINE
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const theme = {
    bg: isDarkMode ? '#121212' : '#f5f5f5',
    card: isDarkMode ? '#1E1E1E' : '#fff',
    text: isDarkMode ? '#FFFFFF' : '#111111',
    subText: isDarkMode ? '#AAAAAA' : '#666666',
    border: isDarkMode ? '#333333' : '#eeeeee',
  };

  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [schedules, setSchedules] = useState([]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    if (!user) return; 
    const q = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(cloudGroups);
      if (cloudGroups.length > 0 && !activeGroupId) setActiveGroupId(cloudGroups[0].id);
    });
    return () => unsubscribe();
  }, [user]);

  React.useEffect(() => {
    if (!user) return; 
    const unsubscribe = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const cloudSchedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchedules(cloudSchedules); 
    });
    return () => unsubscribe(); 
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'notifications'), where('read', '==', false));
    const unsubscribe = onSnapshot(q, snapshot => setHasUnreadNotifications(!snapshot.empty));
    return unsubscribe;
  }, [user]);

  React.useEffect(() => {
    if (!user || groups.length === 0) return;
    const hasUnread = groups.some(group => (group.lastMessageAt || 0) > (group.lastRead?.[user.uid] || 0));
    setHasUnreadMessages(hasUnread);
  }, [groups, user]);

  const notifyUser = async (targetUid, title, body) => {
    if (!targetUid) return;
    try {
      await addDoc(collection(db, 'users', targetUid, 'notifications'), {
        title, body, createdAt: Date.now(), read: false
      });
    } catch (e) { console.error("Notification failed", e); }
  };

  const createCircle = async (circleName) => {
    if (!circleName) return;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      await addDoc(collection(db, 'groups'), {
        name: circleName,
        memberCount: 1,
        image: `https://ui-avatars.com/api/?name=${circleName.replace(' ', '+')}&background=random&color=fff`,
        // Inside createCircle, update the addDoc payload to include:
        ownerId: user.uid,
        members: [user.uid],
        admins: [], // <-- ADD THIS LINE
        joinRequests: [],
        inviteCode: inviteCode
      });
    } catch (error) { console.error("Error creating circle: ", error); }
  };

  const joinCircle = async (code) => {
    if (!code) return;
    try {
      const q = query(collection(db, 'groups'), where('inviteCode', '==', code.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) return Alert.alert("Error", "Invalid Invite Code.");
      
      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data();

      if (groupData.members.includes(user.uid)) return Alert.alert("Oops", "You are already in this Circle!");
      if (groupData.joinRequests?.includes(user.uid)) return Alert.alert("Pending", "Your request is already pending approval.");

      await updateDoc(doc(db, 'groups', groupDoc.id), { joinRequests: arrayUnion(user.uid) });
      await addDoc(collection(db, 'users', groupData.ownerId, 'notifications'), {
        title: "Join Request",
        body: `${user.displayName || 'Someone'} wants to join ${groupData.name}`,
        createdAt: Date.now(),
        read: false,
        type: 'join_request',
        requesterUid: user.uid,
        groupId: groupDoc.id
      });
      Alert.alert("Request Sent", `Your request to join ${groupData.name} was sent.`);
    } catch (error) { console.error("Error joining circle: ", error); }
  };

  const updateCircle = async (groupId, newName, newImage) => {
    try {
      const updates = {};
      if (newName) updates.name = newName;
      if (newImage) updates.image = newImage;
      await updateDoc(doc(db, 'groups', groupId), updates);
      notifyUser(groupId, "Circle Updated", "A circle admin changed the group settings.");
    } catch (error) { console.error("Error updating circle: ", error); }
  };

  const leaveCircle = async (groupId) => {
    try {
      const groupToLeave = groups.find(g => g.id === groupId);
      if (!groupToLeave) return;
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayRemove(user.uid),
        memberCount: Math.max(0, groupToLeave.memberCount - 1)
      });
      await notifyUser(groupToLeave.ownerId, "Member Left", `${user.displayName || 'Someone'} left ${groupToLeave.name}`);
      if (activeGroupId === groupId) setActiveGroupId(null);
    } catch (error) { console.error("Error leaving circle: ", error); }
  };

  const deleteCircle = async (groupId) => {
    try {
      const groupToDelete = groups.find(g => g.id === groupId);
      if (!groupToDelete) return;
      const membersToNotify = groupToDelete.members.filter(uid => uid !== user.uid);
      for (const uid of membersToNotify) {
        await notifyUser(uid, "Circle Deleted", `${groupToDelete.name} was deleted by the owner`);
      }
      await deleteDoc(doc(db, 'groups', groupId));
      if (activeGroupId === groupId) setActiveGroupId(null);
    } catch (error) { console.error("Error deleting circle: ", error); }
  };

  const kickMember = async (groupId, memberId) => {
    try {
      const groupToEdit = groups.find(g => g.id === groupId);
      if (!groupToEdit) return;
      await notifyUser(memberId, "Removed from Circle", `You were removed from ${groupToEdit.name}`);
      const otherMembers = groupToEdit.members.filter(uid => uid !== memberId);
      for (const uid of otherMembers) {
        await notifyUser(uid, "Member Removed", `A member was removed from ${groupToEdit.name}`);
      }
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayRemove(memberId),
        memberCount: Math.max(0, groupToEdit.memberCount - 1)
      });
      if (memberId === user.uid && activeGroupId === groupId) setActiveGroupId(null);
    } catch (error) { console.error("Error kicking member: ", error); }
  };

  const toggleAdmin = async (groupId, memberId, currentAdmins = []) => {
    try {
      const isAlreadyAdmin = currentAdmins.includes(memberId);
      await updateDoc(doc(db, 'groups', groupId), {
        admins: isAlreadyAdmin ? arrayRemove(memberId) : arrayUnion(memberId)
      });
      notifyUser(memberId, "Role Updated", `You are ${isAlreadyAdmin ? 'no longer' : 'now'} an admin in the circle.`);
    } catch (error) { console.error("Admin error:", error); }
  };

  const approveJoinRequest = async (uid) => {
    try {
      const activeGroup = groups.find(g => g.id === activeGroupId);
      if (!activeGroup) return;
      await updateDoc(doc(db, 'groups', activeGroup.id), {
        joinRequests: arrayRemove(uid),
        members: arrayUnion(uid),
        memberCount: activeGroup.memberCount + 1
      });
      await notifyUser(uid, "Join Request Accepted", `You joined ${activeGroup.name}`);
    } catch (error) { console.error("Error approving request:", error); }
  };

  const rejectJoinRequest = async (uid) => {
    try {
      const activeGroup = groups.find(g => g.id === activeGroupId);
      if (!activeGroup) return;
      await updateDoc(doc(db, 'groups', activeGroup.id), { joinRequests: arrayRemove(uid) });
      await notifyUser(uid, "Join Request Rejected", `Your request to join ${activeGroup.name} was rejected`);
    } catch (error) { console.error("Error rejecting request:", error); }
  };
  
  const addSchedule = async (newBlocks) => {
    for (const block of newBlocks) {
      try {
        await addDoc(collection(db, 'schedules'), {
          ...block,
          ownerId: user.uid, 
          owner: user.displayName || 'Me', 
          groupId: activeGroupId,
          avatar: user.photoURL || MY_AVATAR
        });
      } catch (error) { console.error("Error adding to cloud: ", error); }
    }
  };

  const deleteSchedule = async (id) => {
    try { await deleteDoc(doc(db, 'schedules', id)); } 
    catch (error) { console.error("Error deleting from cloud: ", error); }
  };

  const updateSchedule = async (id, newColor) => {
    try {
      await updateDoc(doc(db, 'schedules', id), { color: newColor });
    } catch (error) { console.error("Error updating schedule: ", error); }
  };
  
  // THE CONTEXT VALUE: Bundles all your state to be accessed silently by the Wrappers
  const appState = {
    schedules, deleteSchedule, groups, activeGroupId, setActiveGroup: setActiveGroupId, // <-- THIS IS THE FIX
    createCircle, joinCircle, updateCircle, leaveCircle, deleteCircle,
    kickMember, approveJoinRequest, rejectJoinRequest, addSchedule, updateSchedule, // <-- ADDED HERE
    toggleAdmin, // <-- ADD THIS LINE
    theme, hasUnreadMessages, hasUnreadNotifications
  };

  if (loading) return null; 
  if (!user) return <AuthScreen />;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      <AppContext.Provider value={appState}>
        <NavigationContainer theme={isDarkMode ? NavDarkTheme : DefaultTheme}>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          
          <Stack.Navigator>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="AddSchedule" component={AddScheduleWrapper} options={{ title: 'Add Routine', presentation: 'modal', headerStyle: { backgroundColor: theme.card }, headerTintColor: theme.text }} />
            <Stack.Screen name="CircleChat" component={CircleChat} />
            <Stack.Screen name="EditProfile" component={EditProfile} options={{ title: 'Edit Profile', headerStyle: { backgroundColor: theme.card }, headerTintColor: theme.text }} />
            <Stack.Screen name="Notifications" component={Notifications} options={{ title: 'Notifications', headerStyle: { backgroundColor: theme.card }, headerTintColor: theme.text }} />
            <Stack.Screen name="Privacy" component={Privacy} options={{ title: 'Privacy Settings', headerStyle: { backgroundColor: theme.card }, headerTintColor: theme.text }} />
          </Stack.Navigator>

        </NavigationContainer>
      </AppContext.Provider>
    </ThemeContext.Provider>
  );
}