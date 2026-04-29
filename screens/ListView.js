import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../ThemeContext';

export default function ListView({ schedules, deleteSchedule, groups, activeGroupId, setActiveGroup }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const activeGroup = groups.find(g => g.id === activeGroupId);
  const { theme } = useContext(ThemeContext);

  const handleDelete = (item) => {
    if (item.owner !== 'Me') {
      Alert.alert("Permission Denied", `This schedule belongs to ${item.owner}. You cannot delete it.`);
      return;
    }
    Alert.alert("Delete Schedule", `Remove "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSchedule(item.id) }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* dropdown header */}
      <View style={[styles.dropdownHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.dropdownToggle} onPress={() => setShowDropdown(!showDropdown)}>
          <Image source={{ uri: activeGroup?.image }} style={styles.headerAvatar} />
          <Text style={[styles.dropdownTitle, { color: theme.text }]}>{activeGroup?.name}</Text>
          <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* dropdown nenu overlay */}
      {showDropdown && (
        <View style={[styles.dropdownMenu, { backgroundColor: theme.card }]}>
          {groups.map(group => (
            <TouchableOpacity 
              key={group.id} 
              style={[styles.dropdownItem, { borderColor: theme.border }, activeGroupId === group.id && { backgroundColor: theme.bg }]}
              onPress={() => { setActiveGroup(group.id); setShowDropdown(false); }}
            >
              <Image source={{ uri: group.image }} style={styles.dropdownItemAvatar} />
              <Text style={[styles.dropdownItemText, { color: theme.text }, activeGroupId === group.id && {fontWeight: 'bold', color: '#007bff'}]}>{group.name}</Text>
              {activeGroupId === group.id && <Ionicons name="checkmark" size={18} color="#007bff" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={schedules}
        keyExtractor={item => item.id || Math.random().toString()}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderLeftColor: item.color, backgroundColor: theme.card }]}>
            {/* profile avatar */}
            <Image source={{ uri: item.avatar }} style={styles.cardAvatar} />
            
            <View style={styles.info}>
              <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.time, { color: theme.subText }]}>{item.day} | {item.startTime} - {item.endTime}</Text>
            </View>
            
            {/* trash icon color */}
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color={item.owner === 'Me' ? "#ff4444" : theme.border} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={50} color={theme.border} />
            <Text style={[styles.emptyText, { color: theme.subText }]}>No routines saved in this Circle.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  dropdownHeader: { backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderColor: '#eee', zIndex: 10 },
  dropdownToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  dropdownTitle: { fontSize: 18, fontWeight: '900', color: '#333', marginRight: 5 },
  dropdownMenu: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 8, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, zIndex: 100 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  dropdownItemActive: { backgroundColor: '#f0f8ff' },
  dropdownItemAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  dropdownItemText: { flex: 1, fontSize: 16, color: '#333' },
  card: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 15, marginBottom: 10, 
    borderRadius: 8, elevation: 2, borderLeftWidth: 6,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
  },
  cardAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  time: { fontSize: 14, color: '#666', marginTop: 4 },
  deleteBtn: { padding: 10 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 10, color: '#999', fontSize: 16 }
});