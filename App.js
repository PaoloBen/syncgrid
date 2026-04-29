import React, { useState, useContext } from 'react';
import { TouchableOpacity, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from './ThemeContext';

import Dashboard from './screens/Dashboard';
import ListView from './screens/ListView';
import AddSchedule from './screens/AddSchedule';
import Profile from './screens/Profile'; 

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];
const MY_AVATAR = 'https://instagram.fcgy2-1.fna.fbcdn.net/v/t51.82787-19/636809478_18112806139722828_4134602494262559913_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.fcgy2-1.fna.fbcdn.net&_nc_cat=100&_nc_oc=Q6cZ2gFq5vO3cYA6razKHBZjW9tCDoiO2Hh_zQ3iSNapaHGRPgfU9h3YyYRxv-m2SrsxPQ8&_nc_ohc=Sq_WGKkLxIgQ7kNvwGe2uMQ&_nc_gid=mxLAkFNcSjlpdq_LqfqbxQ&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_Af2q6POTGP3oM6ywIE8KyEGRjCV5_HctpQJWsEpigwQ_ng&oe=69F8007C&_nc_sid=7a9f4b'; // Your global PFP

function MainTabs({ schedules, deleteSchedule, groups, activeGroupId, setActiveGroup, navigation }) {
  const activeSchedules = schedules.filter(s => s.groupId === activeGroupId);
  
  // bring theme to the tabs to style the bottom bar
  const { theme } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Heatmap') iconName = focused ? 'grid' : 'grid-outline';
          if (route.name === 'List') iconName = focused ? 'list' : 'list-outline';
          if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        // apply dark mode to tab bar
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
      <Tab.Screen name="Heatmap" options={{ title: 'SyncGrid' }}>
        {(props) => <Dashboard {...props} schedules={activeSchedules} deleteSchedule={deleteSchedule} groups={groups} activeGroupId={activeGroupId} setActiveGroup={setActiveGroup} />}
      </Tab.Screen>
      <Tab.Screen name="List" options={{ title: 'Routines' }}>
        {(props) => <ListView {...props} schedules={activeSchedules} deleteSchedule={deleteSchedule} groups={groups} activeGroupId={activeGroupId} setActiveGroup={setActiveGroup} />}
      </Tab.Screen>
      <Tab.Screen name="Profile" options={{ title: 'Settings', headerRight: null }}>
        {(props) => <Profile {...props} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  // --- dark mode engine ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const theme = {
    bg: isDarkMode ? '#121212' : '#f5f5f5',
    card: isDarkMode ? '#1E1E1E' : '#fff',
    text: isDarkMode ? '#FFFFFF' : '#111111',
    subText: isDarkMode ? '#AAAAAA' : '#666666',
    border: isDarkMode ? '#333333' : '#eeeeee',
  };

  // --- test db ---
  const [groups, setGroups] = useState([
    { id: 'g1', name: 'Mobile Dev Group', memberCount: 3, image: 'https://ui-avatars.com/api/?name=MD&background=0D8ABC&color=fff' },
    { id: 'g2', name: 'Scheherazade', memberCount: 5, image: 'https://instagram.fcgy2-3.fna.fbcdn.net/v/t51.2885-19/362890576_844186973706515_399183971342514014_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby41MDAuYzIifQ&_nc_ht=instagram.fcgy2-3.fna.fbcdn.net&_nc_cat=111&_nc_oc=Q6cZ2gEzBUdNviSRsokHck4dS0jJJLV4Kc-8lF_F8LWEhE0XqUdStO9YaNG9eJCchrcA9w0&_nc_ohc=CxLNuck-IsgQ7kNvwGxh75L&_nc_gid=YUttuePRcsKCiTSSid5dyQ&edm=ALGbJPMBAAAA&ccb=7-5&oh=00_Af2d2l17h41w1y4cvC77jWXg5mUquqtDfFIPo6IKHqnRHw&oe=69F8157B&_nc_sid=7d3ac5' },
    { id: 'g3', name: 'Christine & Me', memberCount: 2, image: 'https://instagram.fcgy2-4.fna.fbcdn.net/v/t51.2885-15/471367114_563455253129708_6976685278009430369_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_ht=instagram.fcgy2-4.fna.fbcdn.net&_nc_cat=108&_nc_oc=Q6cZ2gEnqqrkUDMPU32FUrrZt4pKaCtCrT4kgHvVA8eotXnpdAoKKUVKtWWUbvdQKI-FyD4&_nc_ohc=Ub7Suc2jt_0Q7kNvwGN2Srq&_nc_gid=J-bB5gl-8_OIanbgj90xxw&edm=AGXveE0BAAAA&ccb=7-5&oh=00_Af2anxqXtidXe5MMfXFV5Ob6bZOClb5GV90bBlWhsn5Pnw&oe=69F83348&_nc_sid=522435' }
  ]);

  const [activeGroupId, setActiveGroupId] = useState('g1');

  const [schedules, setSchedules] = useState([
    { id: 'c1', title: 'Nursing Clinicals', day: 'MWF', startTime: '7:00 AM', endTime: '3:00 PM', color: '#9C27B0', owner: 'Christine', groupId: 'g3', avatar: 'https://instagram.fcgy2-4.fna.fbcdn.net/v/t51.82787-19/670967611_18099038771085176_924632976069467619_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.fcgy2-4.fna.fbcdn.net&_nc_cat=108&_nc_oc=Q6cZ2gFog9RxMmfC4JyrbEabZctYAxUW4_07dwMNI0mxj72RyJV7hjElbGAXBgHg4tMsWII&_nc_ohc=HxUBTqyavhsQ7kNvwFlOW42&_nc_gid=4vj46SaGGIRhWNTR7b5rmg&edm=ALGbJPMBAAAA&ccb=7-5&oh=00_Af0IitQPnTjzN-pi5SKI-DLVqb0iE8uvdxYeHIkzWGmofQ&oe=69F807D0&_nc_sid=7d3ac5' },
    { id: 'c2', title: 'Study Block', day: 'TTh', startTime: '5:00 PM', endTime: '8:30 PM', color: '#9C27B0', owner: 'Christine', groupId: 'g3', avatar: 'https://instagram.fcgy2-4.fna.fbcdn.net/v/t51.82787-19/670967611_18099038771085176_924632976069467619_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.fcgy2-4.fna.fbcdn.net&_nc_cat=108&_nc_oc=Q6cZ2gFog9RxMmfC4JyrbEabZctYAxUW4_07dwMNI0mxj72RyJV7hjElbGAXBgHg4tMsWII&_nc_ohc=HxUBTqyavhsQ7kNvwFlOW42&_nc_gid=4vj46SaGGIRhWNTR7b5rmg&edm=ALGbJPMBAAAA&ccb=7-5&oh=00_Af0IitQPnTjzN-pi5SKI-DLVqb0iE8uvdxYeHIkzWGmofQ&oe=69F807D0&_nc_sid=7d3ac5' },
    { id: 'b1', title: 'Studio Rehearsal', day: 'Sat', startTime: '6:00 PM', endTime: '10:00 PM', color: '#FF9800', owner: 'Anjel', groupId: 'g2', avatar: 'https://instagram.fcgy2-2.fna.fbcdn.net/v/t51.2885-19/446347354_772725491322124_4328159891494468823_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby43MjAuYzIifQ&_nc_ht=instagram.fcgy2-2.fna.fbcdn.net&_nc_cat=104&_nc_oc=Q6cZ2gGfFmBe_MYik2X6QA8PRUrg7z6U69-wM3fLFnXI5hk7CdOmPXa1iZKn8bN3Ci3xuQo&_nc_ohc=2Jb1o2kKBwUQ7kNvwG6muNt&_nc_gid=xY3pn1kgMHjZkMWdTvMAXA&edm=APoiHPcBAAAA&ccb=7-5&oh=00_Af1Tlfrk31SfiyqyDGfMcH0ZIu1Lsd1eO4Hr47sgaju0lg&oe=69F833D0&_nc_sid=22de04' },
    { id: 'm1', title: 'Class', day: 'TTh', startTime: '12:30 PM', endTime: '3:00 PM', color: '#4CAF50', owner: 'Me', groupId: 'g1', avatar: MY_AVATAR },
  ]);

  const addSchedule = (newBlocks) => {
    const assignedColor = COLORS[schedules.length % COLORS.length];
    const blocksWithIds = newBlocks.map(block => ({
      ...block,
      id: Math.random().toString(),
      color: assignedColor,
      owner: 'Me',
      groupId: activeGroupId, 
      avatar: MY_AVATAR
    }));
    setSchedules(prev => [...prev, ...blocksWithIds]);
  };

  const deleteSchedule = (id) => {
    setSchedules(schedules.filter(item => item.id !== id));
  };

  return (
    // wrap entire app in themeContext provider to broadcast the theme
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      <NavigationContainer theme={isDarkMode ? NavDarkTheme : DefaultTheme}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Stack.Navigator>
          <Stack.Screen name="Main" options={{ headerShown: false }}>
            {(props) => (
              <MainTabs 
                {...props} 
                schedules={schedules} 
                deleteSchedule={deleteSchedule} 
                groups={groups}
                activeGroupId={activeGroupId}
                setActiveGroup={setActiveGroupId}
              />
            )}
          </Stack.Screen>
          <Stack.Screen 
            name="AddSchedule" 
            options={{ 
              title: 'Add Routine', 
              presentation: 'modal',
              headerStyle: { backgroundColor: theme.card },
              headerTintColor: theme.text
            }}
          >
            {(props) => <AddSchedule {...props} addSchedule={addSchedule} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}