import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../ThemeContext';
import { auth, db } from '../firebaseConfig'; 
import { doc, getDoc } from 'firebase/firestore'; 
import * as ImagePicker from 'expo-image-picker'; 

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const generateHourLabels = () => {
  const labels = [];
  const periods = ['AM', 'PM'];
  periods.forEach(period => {
    for (let h = 0; h < 12; h++) { labels.push(`${h === 0 ? 12 : h} ${period}`); }
  });
  labels.push('12 AM');
  return labels;
};

const HOUR_LABELS = generateHourLabels();
const MINUTE_HEIGHT = 1; 
const HOUR_HEIGHT = 60 * MINUTE_HEIGHT; 

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const parseDays = (dayString) => {
  const days = [];
  let s = dayString;
  if (s.includes('Su')) { days.push(6); s = s.replace('Su', ''); }
  if (s.includes('Th')) { days.push(3); s = s.replace('Th', ''); }
  if (s.includes('M')) days.push(0);
  if (s.includes('T')) days.push(1);
  if (s.includes('W')) days.push(2);
  if (s.includes('F')) days.push(4);
  if (s.includes('S')) days.push(5);
  return days;
};

export default function Dashboard({ navigation, schedules, deleteSchedule, groups, activeGroupId, setActiveGroup, updateCircle, leaveCircle, deleteCircle, kickMember, approveJoinRequest, rejectJoinRequest, toggleAdmin, updateSchedule }) {
  const [viewMode, setViewMode] = useState('schedules'); 
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [isManageModalVisible, setManageModalVisible] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupImage, setEditGroupImage] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [circleMembers, setCircleMembers] = useState([]); 
  const [pendingUsers, setPendingUsers] = useState([]);

  const { theme } = useContext(ThemeContext);
  const activeGroup = groups.find(g => g.id === activeGroupId);
  // --- CURRENT TIME LINE LOGIC ---
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update the line position every 60 seconds
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- EDIT ROUTINE STATE ---
  const ROUTINE_COLORS = ['#4285F4', '#0F9D58', '#F4B400', '#DB4437', '#673AB7', '#00ACC1', '#FF7043', '#8D6E63'];
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isScheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [editColor, setEditColor] = useState('');

  // --- PERMISSIONS LOGIC ---
  const isOwner = activeGroup?.ownerId === auth.currentUser?.uid;
  const isAdmin = isOwner || (activeGroup?.admins || []).includes(auth.currentUser?.uid);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!isManageModalVisible || !activeGroup) return;
      try {
        if (activeGroup.members?.length > 0) {
          const memberPromises = activeGroup.members.map(uid => getDoc(doc(db, 'users', uid)));
          const memberDocs = await Promise.all(memberPromises);
          setCircleMembers(memberDocs.filter(d => d.exists()).map(d => ({ uid: d.id, ...d.data() })));
        } else setCircleMembers([]);

        if (activeGroup.joinRequests?.length > 0) {
          const pendingPromises = activeGroup.joinRequests.map(uid => getDoc(doc(db, 'users', uid)));
          const pendingDocs = await Promise.all(pendingPromises);
          setPendingUsers(pendingDocs.filter(d => d.exists()).map(d => ({ uid: d.id, ...d.data() })));
        } else setPendingUsers([]);

      } catch (e) { console.error(e); }
    };
    fetchMembers();
  }, [isManageModalVisible, activeGroup]);

  const pickAndUploadCircleAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setIsUploadingImage(true);
      try {
        const apiKey = 'be6472112dc77de47b8acd1f875236ca';
        const formData = new FormData(); formData.append('image', result.assets[0].base64);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) setEditGroupImage(data.data.url); 
        else throw new Error("ImgBB upload failed");
      } catch (error) { Alert.alert("L", "Could not upload image. Check your connection."); } 
      finally { setIsUploadingImage(false); }
    }
  };

  const handleBlockPress = (schedule) => {
    if (viewMode === 'freetime') return; 
    
    if (schedule.ownerId !== auth.currentUser?.uid) {
      return Alert.alert("Permission Denied", `This schedule belongs to ${schedule.owner}.`);
    }
    
    // Open edit modal for their own schedule
    setSelectedSchedule(schedule);
    setEditColor(schedule.color || '#4285F4');
    setScheduleModalVisible(true);
  };

  // --- CLICKABLE PROFILE LOGIC USING PRIVACY SETTINGS ---
  const showMemberProfile = (member) => {
    const bio = member.publicBio !== false ? (member.bio || 'No bio provided.') : '🔒 Hidden by user';
    const gender = member.publicGender !== false ? (member.gender || 'Not specified') : '🔒 Hidden';
    const nationality = member.publicNationality !== false ? (member.nationality || 'Not specified') : '🔒 Hidden';

    Alert.alert(
      member.name || 'User Profile',
      `Bio: ${bio}\n\nGender: ${gender}\nNationality: ${nationality}`,
      [{ text: "Close", style: "cancel" }]
    );
  };

  const generateGridBlocks = () => { 
    if (viewMode === 'schedules') {
      const blocks = [];
      schedules.forEach((schedule) => {
        const startMins = timeToMinutes(schedule.startTime);
        const endMins = timeToMinutes(schedule.endTime);
        const dayIndices = parseDays(schedule.day);
        dayIndices.forEach(dayIdx => {
          if (startMins <= endMins) blocks.push({ ...schedule, dayIdx, top: startMins * MINUTE_HEIGHT, height: (endMins - startMins) * MINUTE_HEIGHT });
          else {
            blocks.push({ ...schedule, dayIdx, top: startMins * MINUTE_HEIGHT, height: (1440 - startMins) * MINUTE_HEIGHT });
            blocks.push({ ...schedule, dayIdx: (dayIdx + 1) % 7, top: 0, height: endMins * MINUTE_HEIGHT });
          }
        });
      });
      return blocks;
    } else {
      const busyByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      schedules.forEach(sched => {
        const startMins = timeToMinutes(sched.startTime);
        const endMins = timeToMinutes(sched.endTime);
        const dayIndices = parseDays(sched.day);
        dayIndices.forEach(d => {
          if (startMins <= endMins) busyByDay[d].push({ start: startMins, end: endMins });
          else { busyByDay[d].push({ start: startMins, end: 1440 }); busyByDay[(d + 1) % 7].push({ start: 0, end: endMins }); }
        });
      });
      const freeBlocks = [];
      Object.keys(busyByDay).forEach(dayIdx => {
        const blocks = busyByDay[dayIdx].sort((a, b) => a.start - b.start);
        let mergedBusy = [];
        blocks.forEach(b => {
          if (mergedBusy.length === 0) mergedBusy.push(b);
          else { let last = mergedBusy[mergedBusy.length - 1]; if (b.start <= last.end) last.end = Math.max(last.end, b.end); else mergedBusy.push(b); }
        });
        let currentMins = 480; 
        mergedBusy.forEach(busy => {
          if (busy.start > currentMins && busy.start < 1320) freeBlocks.push({ dayIdx: parseInt(dayIdx), top: currentMins * MINUTE_HEIGHT, height: (Math.min(busy.start, 1320) - currentMins) * MINUTE_HEIGHT, color: '#00E676', title: 'FREE', isFree: true });
          currentMins = Math.max(currentMins, busy.end);
        });
        if (currentMins < 1320) freeBlocks.push({ dayIdx: parseInt(dayIdx), top: currentMins * MINUTE_HEIGHT, height: (1320 - currentMins) * MINUTE_HEIGHT, color: '#00E676', title: 'FREE', isFree: true });
      });
      return freeBlocks;
    }
  };

  const gridBlocks = generateGridBlocks();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      <View style={[styles.dropdownHeader, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        {groups && groups.length > 0 ? (
          <>
            <TouchableOpacity style={styles.dropdownToggle} onPress={() => setShowDropdown(!showDropdown)}>
              {activeGroup && <Image source={{ uri: activeGroup.image }} style={styles.headerAvatar} />}
              <View style={{ marginRight: 5 }}>
                <Text style={[styles.dropdownTitle, { color: theme.text }]}>{activeGroup ? activeGroup.name : 'Select a Circle'}</Text>
                {activeGroup && <Text style={{ fontSize: 10, color: theme.subText, marginTop: -2 }}>Code: <Text style={{ fontWeight: 'bold' }}>{activeGroup.inviteCode || 'N/A'}</Text></Text>}
              </View>
              <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color={theme.text} />
            </TouchableOpacity>

            {activeGroup && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity style={{ padding: 5, marginRight: 5, position: 'relative' }} onPress={() => navigation.navigate('CircleChat', { activeGroupId: activeGroup.id, groupName: activeGroup.name })}> 
                  <Ionicons name="chatbubbles" size={24} color="#007bff" />
                  {(activeGroup?.lastMessageAt || 0) > (activeGroup?.lastRead?.[auth.currentUser?.uid] || 0) && (
                    <View style={{ position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30', borderWidth: 1, borderColor: theme.card }} />
                  )}
                </TouchableOpacity>

                {isAdmin && (
                  <TouchableOpacity style={{ padding: 5 }} onPress={() => { setEditGroupName(activeGroup.name); setEditGroupImage(activeGroup.image); setManageModalVisible(true); }}>
                    <Ionicons name="settings-outline" size={24} color={theme.subText} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        ) : (
          <TouchableOpacity style={styles.dropdownToggle} onPress={() => navigation.navigate('Profile')}>
            <View style={{ marginRight: 5, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="add-circle" size={24} color="#007bff" style={{ marginRight: 8 }} />
              <Text style={[styles.dropdownTitle, { color: '#007bff', fontSize: 16 }]}>Create or Join a Circle</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

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
                  updateSchedule(selectedSchedule.id, editColor);
                  setScheduleModalVisible(false);
              }}>
                <Text style={{color: 'white', fontWeight: 'bold'}}>Save Color</Text>
              </TouchableOpacity>

              <View style={{height: 1, backgroundColor: theme.border, marginVertical: 15}} />

              {/* MOVED DELETE BUTTON INSIDE MODAL FOR CLEANER UX */}
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

      {/* CIRCLE MANAGEMENT MODAL */}
      {activeGroup && (
        <Modal visible={isManageModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.manageModal, { backgroundColor: theme.card }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Circle Info</Text>

              <Text style={{color: theme.subText, marginBottom: 15, textAlign: 'center'}}>
                Invite Code: <Text style={{fontWeight: 'bold', color: theme.text, fontSize: 18}}>{activeGroup.inviteCode}</Text>
              </Text>

              {isAdmin && (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 15 }}>
                    <TouchableOpacity onPress={pickAndUploadCircleAvatar} disabled={isUploadingImage}>
                      {isUploadingImage ? (
                        <View style={[styles.modalAvatar, { justifyContent: 'center', alignItems: 'center' }]}>
                          <ActivityIndicator size="small" color="#007bff" />
                        </View>
                      ) : (
                        <Image source={{ uri: editGroupImage || activeGroup.image }} style={styles.modalAvatar} />
                      )}
                    </TouchableOpacity>
                    <Text style={{ fontSize: 12, color: theme.subText, marginTop: 5 }}>Tap to change icon</Text>
                  </View>

                  <Text style={[styles.inputLabel, { color: theme.text }]}>Circle Name</Text>
                  <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg }]}
                    value={editGroupName} onChangeText={setEditGroupName} placeholder="Enter new name" placeholderTextColor={theme.subText}
                  />

                  <TouchableOpacity style={styles.saveBtn} onPress={() => {
                      if(editGroupName.trim()) {
                        const newImage = editGroupImage !== activeGroup.image ? editGroupImage : null;
                        updateCircle(activeGroup.id, editGroupName, newImage);
                        setManageModalVisible(false);
                      }
                  }}>
                    <Text style={{color: 'white', fontWeight: 'bold'}}>Save Changes</Text>
                  </TouchableOpacity>
                </>
              )}

              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 15 }]}>Members ({activeGroup.memberCount})</Text>
              <View style={{ maxHeight: 150, marginBottom: 15, backgroundColor: theme.bg, borderRadius: 8, padding: 10 }}>
                <ScrollView>
                  {circleMembers.map(member => {
                    const memberIsOwner = member.uid === activeGroup.ownerId;
                    const memberIsAdmin = memberIsOwner || (activeGroup.admins || []).includes(member.uid);
                    const canKick = isOwner || (isAdmin && !memberIsOwner && !memberIsAdmin);

                    return (
                      <View key={member.uid} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: theme.border }}>
                        
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                          onPress={() => showMemberProfile(member)}
                        >
                          <Image source={{ uri: member.avatar || 'https://ui-avatars.com/api/?name=User' }} style={{ width: 30, height: 30, borderRadius: 15, marginRight: 10 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.text }}>{member.name || 'Unknown'}</Text>
                            {memberIsOwner ? (
                              <Text style={{ color: '#007bff', fontWeight: 'bold', fontSize: 10 }}>OWNER</Text>
                            ) : memberIsAdmin ? (
                              <Text style={{ color: '#00E676', fontWeight: 'bold', fontSize: 10 }}>ADMIN</Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                        
                        {isOwner && !memberIsOwner && (
                          <TouchableOpacity onPress={() => toggleAdmin(activeGroup.id, member.uid, activeGroup.admins)} style={{ marginRight: 10 }}>
                            <Text style={{ color: theme.subText, fontWeight: 'bold', fontSize: 10 }}>
                              {memberIsAdmin ? 'DEMOTE' : 'MAKE ADMIN'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {canKick && member.uid !== auth.currentUser.uid && (
                          <TouchableOpacity onPress={() => {
                            Alert.alert("Kick Member", `Remove ${member.name}?`, [
                              { text: "Cancel", style: "cancel" },
                              { text: "Kick", style: "destructive", onPress: () => kickMember(activeGroup.id, member.uid) }
                            ]);
                          }}>
                            <Text style={{ color: '#F44336', fontWeight: 'bold', fontSize: 12 }}>KICK</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {isAdmin && pendingUsers.length > 0 && (
                <>
                  <Text style={[styles.inputLabel, { color: theme.text, marginTop: 10 }]}>Pending Requests</Text>
                  <View style={{ maxHeight: 150, marginBottom: 15, backgroundColor: theme.bg, borderRadius: 8, padding: 10 }}>
                    <ScrollView>
                      {pendingUsers.map(member => (
                        <View key={member.uid} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: theme.border }}>
                          <Image source={{ uri: member.avatar || 'https://ui-avatars.com/api/?name=User' }} style={{ width: 30, height: 30, borderRadius: 15, marginRight: 10 }} />
                          <Text style={{ flex: 1, color: theme.text }}>{member.name || 'Unknown'}</Text>
                          <TouchableOpacity onPress={async () => await approveJoinRequest(member.uid)} style={{ marginRight: 12 }}>
                            <Text style={{ color: '#00E676', fontWeight: 'bold' }}>ACCEPT</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={async () => await rejectJoinRequest(member.uid)}>
                            <Text style={{ color: '#F44336', fontWeight: 'bold' }}>REJECT</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              <View style={{height: 1, backgroundColor: theme.border, marginVertical: 10}} />

              {isOwner && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => {
                    Alert.alert("Delete Circle", "Are you sure? This will permanently destroy the circle for everyone.", [
                      { text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => { deleteCircle(activeGroup.id); setManageModalVisible(false); } }
                    ]);
                  }}>
                  <Ionicons name="trash-outline" size={20} color="white" style={{ marginRight: 5 }} />
                  <Text style={{color: 'white', fontWeight: 'bold'}}>Delete Circle</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setManageModalVisible(false)}>
                <Text style={{color: theme.subText, fontWeight: 'bold'}}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {showDropdown && (
        <View style={[styles.dropdownMenu, { backgroundColor: theme.card }]}>
          {groups.map(group => (
            <TouchableOpacity key={group.id} style={[styles.dropdownItem, { borderColor: theme.border }, activeGroupId === group.id && { backgroundColor: theme.bg }]} onPress={() => { setActiveGroup(group.id); setShowDropdown(false); }}>
              <View style={{ position: 'relative', marginRight: 10 }}>
                <Image source={{ uri: group.image }} style={{ width: 30, height: 30, borderRadius: 15 }} />
                {(group.lastMessageAt || 0) > (group.lastRead?.[auth.currentUser?.uid] || 0) && (
                  <View style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30', borderWidth: 1.5, borderColor: theme.card }} />
                )}
              </View>
              <Text style={[styles.dropdownItemText, { color: theme.text }, activeGroupId === group.id && {fontWeight: 'bold', color: '#007bff'}]}>{group.name}</Text>
              {activeGroupId === group.id && <Ionicons name="checkmark" size={18} color="#007bff" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[styles.toggleBar, { backgroundColor: theme.border }]}>
        <TouchableOpacity style={[styles.toggleBtn, viewMode === 'schedules' && styles.activeToggle]} onPress={() => setViewMode('schedules')}>
          <Text style={[styles.toggleText, { color: theme.subText }, viewMode === 'schedules' && styles.activeToggleText]}>Schedules</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, viewMode === 'freetime' && styles.activeToggleFree]} onPress={() => setViewMode('freetime')}>
          <Text style={[styles.toggleText, { color: theme.subText }, viewMode === 'freetime' && styles.activeToggleText]}>Find Free Time</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.daysHeaderContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.timeAxisPlaceholder} />
        <View style={styles.daysAxis}>
          {DAYS.map((day, idx) => (<View key={idx} style={styles.dayHeaderCell}><Text style={[styles.dayHeaderText, { color: theme.text }]}>{day[0]}</Text></View>))}
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.gridCanvas}>
          <View style={[styles.timeAxis, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {HOUR_LABELS.map((label, idx) => (<View key={idx} style={styles.timeLabelContainer}><Text style={[styles.timeLabelText, { color: theme.subText }]}>{label}</Text></View>))}
          </View>
          <View style={styles.daysGrid}>
            {HOUR_LABELS.map((_, idx) => (<View key={`line-${idx}`} style={[styles.gridLine, { top: idx * HOUR_HEIGHT, backgroundColor: theme.border }]} />))}
            {DAYS.map((_, idx) => (<View key={`div-${idx}`} style={[styles.verticalDivider, { left: `${(idx / 7) * 100}%`, backgroundColor: theme.border }]} />))}

            {/* --- CURRENT TIME INDICATOR --- */}
            <View style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: (currentTime.getHours() * 60 + currentTime.getMinutes()) * MINUTE_HEIGHT,
              height: 2,
              backgroundColor: '#FF3B30',
              zIndex: 50,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30', marginLeft: -4 }} />
            </View>
            {/* ------------------------------- */}

            {gridBlocks.map((block, idx) => (
              <TouchableOpacity
                key={`block-${idx}`} activeOpacity={block.isFree ? 1 : 0.8} onPress={() => handleBlockPress(block)}
                style={[styles.scheduleBlock, { backgroundColor: block.color, top: block.top, height: block.height, left: `${(block.dayIdx / 7) * 100}%`, width: `${100 / 7}%` }]}
              >
                {!block.isFree && block.avatar && <Image source={{ uri: block.avatar }} style={styles.blockAvatar} />}
                <Text style={styles.blockTitle} numberOfLines={2}>{block.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', zIndex: 1 },
  dropdownHeader: { backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderColor: '#eee', zIndex: 10 },
  dropdownToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  dropdownTitle: { fontSize: 18, fontWeight: '900', color: '#333', marginRight: 5 },
  dropdownMenu: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 8, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, zIndex: 100 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  dropdownItemAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  dropdownItemText: { flex: 1, fontSize: 16, color: '#333' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  manageModal: { width: '85%', padding: 25, borderRadius: 15, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eee' }, 
  inputLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  input: { borderWidth: 1, padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 15 },
  saveBtn: { backgroundColor: '#007bff', padding: 12, borderRadius: 8, alignItems: 'center' },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F44336', marginBottom: 10 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F44336', padding: 12, borderRadius: 8, marginBottom: 10 },
  cancelBtn: { alignItems: 'center', padding: 10, marginTop: 5 },

  toggleBar: { flexDirection: 'row', margin: 10, backgroundColor: '#eee', borderRadius: 8, padding: 4, zIndex: 1 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeToggle: { backgroundColor: '#007bff' },
  activeToggleFree: { backgroundColor: '#00E676' },
  toggleText: { fontWeight: 'bold', color: '#666' },
  activeToggleText: { color: '#fff' },
  daysHeaderContainer: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#f9f9f9', zIndex: 1 },
  timeAxisPlaceholder: { width: 55 }, 
  daysAxis: { flex: 1, flexDirection: 'row' },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  dayHeaderText: { fontWeight: 'bold', color: '#666', fontSize: 12 },
  scrollArea: { flex: 1, zIndex: 1 },
  gridCanvas: { flexDirection: 'row', height: 24 * HOUR_HEIGHT },
  timeAxis: { width: 55, borderRightWidth: 1, borderColor: '#eee', backgroundColor: '#fdfdfd' },
  timeLabelContainer: { height: HOUR_HEIGHT, alignItems: 'flex-end', paddingRight: 5 },
  timeLabelText: { fontSize: 10, color: '#999', marginTop: -6 },
  daysGrid: { flex: 1, position: 'relative' },
  gridLine: { position: 'absolute', width: '100%', height: 1, backgroundColor: '#f0f0f0' },
  verticalDivider: { position: 'absolute', width: 1, height: '100%', backgroundColor: '#f8f8f8' },
  scheduleBlock: { position: 'absolute', borderRadius: 4, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  blockAvatar: { width: 16, height: 16, borderRadius: 8, marginBottom: 2, borderWidth: 1, borderColor: '#fff' },
  blockTitle: { color: '#fff', fontSize: 9, fontWeight: 'bold' }
});