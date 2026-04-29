import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ThemeContext } from '../ThemeContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_ACRONYMS = {
  'Mon': 'M', 'Tue': 'T', 'Wed': 'W', 'Thu': 'Th', 'Fri': 'F', 'Sat': 'S', 'Sun': 'Su'
};

const generateTimes = () => {
  const times = [];
  const periods = ['AM', 'PM'];
  periods.forEach(period => {
    for (let h = 0; h < 12; h++) {
      const hour = h === 0 ? 12 : h;
      times.push(`${hour}:00 ${period}`);
      times.push(`${hour}:30 ${period}`);
    }
  });
  return times;
};

const HOURS = generateTimes();

export default function AddSchedule({ navigation, addSchedule }) {
  const [title, setTitle] = useState('');
  const [selections, setSelections] = useState({});
  const { theme } = useContext(ThemeContext);
  
  // mode toggle state
  const [activeMode, setActiveMode] = useState('start'); // can be 'start' or 'end'

  const toggleCell = (day, hour) => {
    const daySelection = selections[day] || {};
    let newDaySelection = { ...daySelection };

    if (activeMode === 'start') {
      // if tapping the existing start box, clear it. otherwise, set it.
      newDaySelection.start = newDaySelection.start === hour ? null : hour;
      
      // prevent overlapping start and end on same box
      if (newDaySelection.start === newDaySelection.end) {
        newDaySelection.end = null;
      }
    } else {
      // if tapping the existing end box, clear it. otherwise, set it.
      newDaySelection.end = newDaySelection.end === hour ? null : hour;
      
      // prevent overlapping start and end on same box
      if (newDaySelection.end === newDaySelection.start) {
        newDaySelection.start = null;
      }
    }

    setSelections(prev => ({ ...prev, [day]: newDaySelection }));
  };

  const handleSave = () => {
    if (!title) return;

    const rawBlocks = [];

    // convert selections to raw schedule blocks
    Object.keys(selections).forEach(day => {
      const sel = selections[day];
      
      if (sel.start) {
        const startTimeStr = sel.start;
        let endTimeStr = sel.end;
        
        // if no end time set
        if (!endTimeStr) {
          const idx = HOURS.indexOf(startTimeStr);
          endTimeStr = idx < HOURS.length - 1 ? HOURS[idx + 1] : '12:00 AM';
        }

        rawBlocks.push({ title, day, startTime: startTimeStr, endTime: endTimeStr });
      }
    });

    if (rawBlocks.length === 0) return;

    // merge identical timeframes
    const mergedBlocksMap = {};
    
    rawBlocks.forEach(block => {
      const timeKey = `${block.startTime}-${block.endTime}`;
      if (!mergedBlocksMap[timeKey]) {
        mergedBlocksMap[timeKey] = { ...block, daysArr: [block.day] };
      } else {
        mergedBlocksMap[timeKey].daysArr.push(block.day);
      }
    });

    const finalBlocks = Object.values(mergedBlocksMap).map(block => {
      block.daysArr.sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
      const combinedDayString = block.daysArr.map(d => DAY_ACRONYMS[d]).join('');

      return {
        title: block.title,
        day: combinedDayString,
        startTime: block.startTime,
        endTime: block.endTime
      };
    });

    addSchedule(finalBlocks);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.label, { color: theme.text }]}>Routine Name</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]} 
        value={title} 
        onChangeText={setTitle} 
        placeholder="e.g., Night Shift, Marathon Run" 
        placeholderTextColor={theme.subText}
      />

      {/* Start-End mode toggle */}
      <TouchableOpacity 
        style={[styles.toggleBtn, activeMode === 'start' ? styles.toggleStart : styles.toggleEnd]}
        onPress={() => setActiveMode(activeMode === 'start' ? 'end' : 'start')}
        activeOpacity={0.8}
      >
        <Text style={styles.toggleText}>
          MODE: SETTING {activeMode === 'start' ? 'START' : 'END'} TIME (Tap to Switch)
        </Text>
      </TouchableOpacity>
      
      <ScrollView style={[styles.gridContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
          <View style={{ paddingRight: 15, paddingBottom: 15 }}>
            
            <View style={styles.row}>
              <View style={styles.timeLabelEmpty} />
              {DAYS.map(day => (
                <Text key={day} style={[styles.dayHeader, { color: theme.text }]}>{day}</Text>
              ))}
            </View>

            {HOURS.map(hour => (
              <View key={hour} style={styles.row}>
                <Text style={[styles.timeLabel, { color: theme.subText }]}>{hour}</Text>
                {DAYS.map(day => {
                  const sel = selections[day] || {};
                  const isStart = sel.start === hour;
                  const isEnd = sel.end === hour;
                  
                  return (
                    <TouchableOpacity
                      key={`${day}-${hour}`}
                      style={[
                        styles.cell,
                        { backgroundColor: theme.bg, borderColor: theme.border },
                        isStart && styles.cellStart,
                        isEnd && styles.cellEnd
                      ]}
                      onPress={() => toggleCell(day, hour)}
                      activeOpacity={0.7}
                    />
                  );
                })}
              </View>
            ))}

          </View>
        </ScrollView>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button title="Save Routine" onPress={handleSave} color="#007bff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  label: { fontSize: 16, marginBottom: 5, fontWeight: 'bold', color: '#333' },
  input: { 
    borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 15, 
    borderRadius: 8, backgroundColor: 'white', fontSize: 16
  },
  toggleBtn: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
  },
  toggleStart: { backgroundColor: '#4CAF50' }, // Start
  toggleEnd: { backgroundColor: '#F44336' },   // End
  toggleText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  gridContainer: { flex: 1, backgroundColor: 'white', borderRadius: 8, padding: 5, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  timeLabelEmpty: { width: 65 }, 
  dayHeader: { width: 45, textAlign: 'center', fontWeight: 'bold', color: '#555', fontSize: 12, marginHorizontal: 1 },
  timeLabel: { width: 65, fontSize: 11, color: '#555', textAlign: 'right', paddingRight: 5 },
  cell: {
    width: 45, 
    height: 30,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fdfdfd',
    marginHorizontal: 1,
    borderRadius: 4,
  },
  cellStart: {
    backgroundColor: '#4CAF50', 
    borderColor: '#388E3C',
  },
  cellEnd: {
    backgroundColor: '#F44336', 
    borderColor: '#D32F2F',
  },
  buttonContainer: { marginTop: 15 }
});