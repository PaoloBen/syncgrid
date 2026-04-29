import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../ThemeContext';

export default function Profile() {
  const { isDarkMode, toggleTheme, theme } = useContext(ThemeContext);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.profileHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Image source={{ uri: 'https://instagram.fcgy2-1.fna.fbcdn.net/v/t51.82787-19/636809478_18112806139722828_4134602494262559913_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.fcgy2-1.fna.fbcdn.net&_nc_cat=100&_nc_oc=Q6cZ2gFq5vO3cYA6razKHBZjW9tCDoiO2Hh_zQ3iSNapaHGRPgfU9h3YyYRxv-m2SrsxPQ8&_nc_ohc=Sq_WGKkLxIgQ7kNvwGe2uMQ&_nc_gid=mxLAkFNcSjlpdq_LqfqbxQ&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_Af2q6POTGP3oM6ywIE8KyEGRjCV5_HctpQJWsEpigwQ_ng&oe=69F8007C&_nc_sid=7a9f4b' }} style={styles.profileImage} />
        <View style={styles.profileInfo}>
          <Text style={[styles.userName, { color: theme.text }]}>Paul Benedict</Text>
          <Text style={[styles.userBio, { color: theme.subText }]}>BSCS Student • USC</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]}>
          <Ionicons name="person-circle-outline" size={24} color={theme.subText} />
          <Text style={[styles.menuText, { color: theme.text }]}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.border} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]}>
          <Ionicons name="notifications-outline" size={24} color={theme.subText} />
          <Text style={[styles.menuText, { color: theme.text }]}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.border} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]}>
          <Ionicons name="lock-closed-outline" size={24} color={theme.subText} />
          <Text style={[styles.menuText, { color: theme.text }]}>Privacy & Permissions</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.border} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Preferences</Text>
        
        {/* dark mode toggle */}
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]} onPress={toggleTheme}>
          <Ionicons name={isDarkMode ? "moon" : "color-palette-outline"} size={24} color={isDarkMode ? "#007bff" : theme.subText} />
          <Text style={[styles.menuText, { color: theme.text }]}>Dark Mode</Text>
          <View style={[styles.statusBadge, { backgroundColor: isDarkMode ? '#333' : '#eee' }]}>
            <Text style={[styles.statusText, { color: isDarkMode ? '#fff' : '#555' }]}>{isDarkMode ? 'ON' : 'OFF'}</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.card }]}>
          <Ionicons name="sync-outline" size={24} color={theme.subText} />
          <Text style={[styles.menuText, { color: theme.text }]}>Sync External Calendars</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.border} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: isDarkMode ? '#331111' : '#ffebee' }]}>
        <Text style={[styles.logoutText, { color: isDarkMode ? '#ff4444' : '#d32f2f' }]}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  profileImage: { width: 70, height: 70, borderRadius: 35, marginRight: 15 },
  profileInfo: { flex: 1 },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  userBio: { fontSize: 14, color: '#666', marginTop: 4 },
  section: { marginTop: 25, paddingHorizontal: 15 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 8 },
  menuText: { flex: 1, fontSize: 16, color: '#333', marginLeft: 15 },
  statusBadge: { backgroundColor: '#eee', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  logoutBtn: { margin: 30, backgroundColor: '#ffebee', padding: 15, borderRadius: 10, alignItems: 'center' },
  logoutText: { color: '#d32f2f', fontWeight: 'bold', fontSize: 16 }
});