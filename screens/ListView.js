import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../ThemeContext';
import { auth } from '../firebaseConfig';

const ROUTINE_COLORS = ['#4285F4', '#0F9D58', '#F4B400', '#DB4437', '#673AB7', '#00ACC1', '#FF7043', '#8D6E63'];

export default function ListView({ schedules, deleteSchedule, groups, activeGroupId, setActiveGroup, updateSchedule }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const activeGroup = groups.find(g => g.id === activeGroupId);
  const { theme } = useContext(ThemeContext);

  // --- EDIT MODAL STATE ---
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isScheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [editColor, setEditColor] = useState('');

  const handleCardPress = (item) => {
    if (item.ownerId !== auth.currentUser?.uid) {
      const ownerName = item.ownerId === auth.currentUser?.uid ? "you" : item.owner || "another member";
      Alert.alert("Permission Denied", `Only the owner of this routine can edit or delete it.\n\nOwner: ${ownerName}`);
      return;
    }

    setSelectedSchedule(item);
    setEditColor(item.color || '#4285F4');
    setScheduleModalVisible(true);
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

      {/* dropdown menu overlay */}
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

      {/* EDIT ROUTINE MODAL */}
      {selectedSchedule && (
        <Modal visible={isScheduleModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.manageModal, { backgroundColor: theme.card }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Routine</Text>
              <Text style={{color: theme.subText, marginBottom: 20, textAlign: 'center', fontSize: 16, fontWeight: 'bold'}}>
                {selectedSchedule.title}
              </Text>

              <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 10 }]}>Change Color</Text>
              
              <View style={{ marginBottom: 25 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {ROUTINE_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setEditColor(color)}
                      style={[{ width: 40, height: 40, borderRadius: 20, marginRight: 12, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: color }]}
                    >
                      {editColor === color && <Ionicons name="checkmark" size={20} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={() => {
                  if (updateSchedule) updateSchedule(selectedSchedule.id, editColor);
                  setScheduleModalVisible(false);
              }}>
                <Text style={{color: 'white', fontWeight: 'bold'}}>Save Color</Text>
              </TouchableOpacity>

              <View style={{height: 1, backgroundColor: theme.border, marginVertical: 15}} />

              <TouchableOpacity style={styles.deleteBtn} onPress={() => {
                Alert.alert("Delete Schedule", `Remove "${selectedSchedule.title}"?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => {
                      deleteSchedule(selectedSchedule.id);
                      setScheduleModalVisible(false);
                  }}
                ]);
              }}>
                <Ionicons name="trash-outline" size={20} color="white" style={{ marginRight: 5 }} />
                <Text style={{color: 'white', fontWeight: 'bold'}}>Delete Routine</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setScheduleModalVisible(false)}>
                <Text style={{color: theme.subText, fontWeight: 'bold'}}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <FlatList
        data={schedules}
        keyExtractor={item => item.id || Math.random().toString()}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => handleCardPress(item)}
            style={[styles.card, { borderLeftColor: item.color, backgroundColor: theme.card }]}
          >
            {/* profile avatar */}
            <Image source={{ uri: item.avatar }} style={styles.cardAvatar} />
            
            <View style={styles.info}>
              <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.time, { color: theme.subText }]}>{item.day} | {item.startTime} - {item.endTime}</Text>
            </View>
            
            {/* edit indicator icon instead of raw trash */}
            <View style={styles.editIconWrapper}>
              <Ionicons name="pencil" size={26} color={theme.border} />
            </View>
          </TouchableOpacity>
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
  editIconWrapper: { padding: 10 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 10, color: '#999', fontSize: 16 },

  /* Modal Styles Imported from Dashboard */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  manageModal: { width: '85%', padding: 25, borderRadius: 15, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  inputLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  saveBtn: { backgroundColor: '#007bff', padding: 12, borderRadius: 8, alignItems: 'center' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F44336', padding: 12, borderRadius: 8, marginBottom: 10 },
  cancelBtn: { alignItems: 'center', padding: 10, marginTop: 5 },
});