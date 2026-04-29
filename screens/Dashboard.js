import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../ThemeContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const generateHourLabels = () => {
  const labels = [];
  const periods = ['AM', 'PM'];
  periods.forEach(period => {
    for (let h = 0; h < 12; h++) {
      labels.push(`${h === 0 ? 12 : h} ${period}`);
    }
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

export default function Dashboard({ navigation, schedules, deleteSchedule, groups, activeGroupId, setActiveGroup }) {
  const [viewMode, setViewMode] = useState('schedules'); 
  const [showDropdown, setShowDropdown] = useState(false);
  const { theme, isDarkMode } = useContext(ThemeContext);

  const activeGroup = groups.find(g => g.id === activeGroupId);

  const handleBlockPress = (schedule) => {
    if (viewMode === 'freetime') return; 
    
    // permission lock
    if (schedule.owner !== 'Me') {
      Alert.alert("Permission Denied", `This schedule belongs to ${schedule.owner}. You cannot delete it.`);
      return;
    }
    
    Alert.alert("Delete Schedule", `Remove "${schedule.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSchedule(schedule.id) }
    ]);
  };

  const generateGridBlocks = () => {
    if (viewMode === 'schedules') {
      const blocks = [];
      schedules.forEach((schedule) => {
        const startMins = timeToMinutes(schedule.startTime);
        const endMins = timeToMinutes(schedule.endTime);
        const dayIndices = parseDays(schedule.day);

        dayIndices.forEach(dayIdx => {
          if (startMins <= endMins) {
            blocks.push({ ...schedule, dayIdx, top: startMins * MINUTE_HEIGHT, height: (endMins - startMins) * MINUTE_HEIGHT });
          } else {
            blocks.push({ ...schedule, dayIdx, top: startMins * MINUTE_HEIGHT, height: (1440 - startMins) * MINUTE_HEIGHT });
            blocks.push({ ...schedule, dayIdx: (dayIdx + 1) % 7, top: 0, height: endMins * MINUTE_HEIGHT });
          }
        });
      });
      return blocks;
    } else {
      // free time calculator
      const busyByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      schedules.forEach(sched => {
        const startMins = timeToMinutes(sched.startTime);
        const endMins = timeToMinutes(sched.endTime);
        const dayIndices = parseDays(sched.day);
        dayIndices.forEach(d => {
          if (startMins <= endMins) busyByDay[d].push({ start: startMins, end: endMins });
          else {
            busyByDay[d].push({ start: startMins, end: 1440 });
            busyByDay[(d + 1) % 7].push({ start: 0, end: endMins });
          }
        });
      });

      const freeBlocks = [];
      Object.keys(busyByDay).forEach(dayIdx => {
        const blocks = busyByDay[dayIdx].sort((a, b) => a.start - b.start);
        let mergedBusy = [];
        blocks.forEach(b => {
          if (mergedBusy.length === 0) mergedBusy.push(b);
          else {
            let last = mergedBusy[mergedBusy.length - 1];
            if (b.start <= last.end) last.end = Math.max(last.end, b.end);
            else mergedBusy.push(b);
          }
        });

        let currentMins = 480; // 8 AM
        mergedBusy.forEach(busy => {
          if (busy.start > currentMins && busy.start < 1320) {
            freeBlocks.push({ dayIdx: parseInt(dayIdx), top: currentMins * MINUTE_HEIGHT, height: (Math.min(busy.start, 1320) - currentMins) * MINUTE_HEIGHT, color: '#00E676', title: 'FREE', isFree: true });
          }
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

      {/* engine toggle bar */}
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
          {DAYS.map((day, idx) => (
            <View key={idx} style={styles.dayHeaderCell}><Text style={[styles.dayHeaderText, { color: theme.text }]}>{day[0]}</Text></View>
          ))}
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

            {gridBlocks.map((block, idx) => (
              <TouchableOpacity
                key={`block-${idx}`}
                activeOpacity={block.isFree ? 1 : 0.8}
                onPress={() => handleBlockPress(block)}
                style={[styles.scheduleBlock, { backgroundColor: block.color, top: block.top, height: block.height, left: `${(block.dayIdx / 7) * 100}%`, width: `${100 / 7}%` }]}
              >
                {/* profile bubble izz heree */}
                {!block.isFree && block.avatar && (
                  <Image source={{ uri: block.avatar }} style={styles.blockAvatar} />
                )}
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
  dropdownItemActive: { backgroundColor: '#f0f8ff' },
  dropdownItemAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  dropdownItemText: { flex: 1, fontSize: 16, color: '#333' },
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