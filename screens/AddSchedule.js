import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { ThemeContext } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_ACRONYMS = { 'Mon': 'M', 'Tue': 'T', 'Wed': 'W', 'Thu': 'Th', 'Fri': 'F', 'Sat': 'S', 'Sun': 'Su' };

// The Custom Palette
const ROUTINE_COLORS = ['#4285F4', '#0F9D58', '#F4B400', '#DB4437', '#673AB7', '#00ACC1', '#FF7043', '#8D6E63'];

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
  const [selectedColor, setSelectedColor] = useState(ROUTINE_COLORS[0]);
  const [activeMode, setActiveMode] = useState('start');
  const [isScanning, setIsScanning] = useState(false);
  const { theme } = useContext(ThemeContext);

  const toggleCell = (day, hour) => {
    const daySelection = selections[day] || {};
    let newDaySelection = { ...daySelection };

    if (activeMode === 'start') {
      newDaySelection.start = newDaySelection.start === hour ? null : hour;
      if (newDaySelection.start === newDaySelection.end) newDaySelection.end = null;
    } else {
      newDaySelection.end = newDaySelection.end === hour ? null : hour;
      if (newDaySelection.end === newDaySelection.start) newDaySelection.start = null;
    }
    setSelections(prev => ({ ...prev, [day]: newDaySelection }));
  };

  const handleSave = () => {
    if (!title) return;
    const rawBlocks = [];

    Object.keys(selections).forEach(day => {
      const sel = selections[day];
      if (sel.start) {
        const startTimeStr = sel.start;
        let endTimeStr = sel.end;
        if (!endTimeStr) {
          const idx = HOURS.indexOf(startTimeStr);
          endTimeStr = idx < HOURS.length - 1 ? HOURS[idx + 1] : '12:00 AM';
        }
        rawBlocks.push({ title, day, startTime: startTimeStr, endTime: endTimeStr });
      }
    });

    if (rawBlocks.length === 0) return;

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
        endTime: block.endTime,
        color: selectedColor
      };
    });

    addSchedule(finalBlocks);
    navigation.goBack();
  };

  // --- AI VISION LOGIC (REST API BYPASS) ---
  const scanScheduleWithAI = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "We need camera roll access to scan your schedule.");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true, 
        quality: 0.5, // Lowered slightly to ensure the payload isn't too massive for mobile networks
      });

      if (pickerResult.canceled) return;

      setIsScanning(true);
      const base64Image = pickerResult.assets[0].base64;
      
      // 1. Setup the raw REST endpoint
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

      // We bump the endpoint to the live gemini-3.5-flash model
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

      const prompt = `
        Analyze this class schedule image. Extract the classes and return ONLY a valid JSON array of objects. 
        Do not use markdown formatting or code blocks. Just raw JSON.
        Each object must strictly match this format:
        {
          "title": "Course Name",
          "day": "Day abbreviation (strictly one of: M, T, W, Th, F, S, Su)",
          "startTime": "Start time rounded to nearest half hour (e.g., 9:00 AM, 1:30 PM)",
          "endTime": "End time rounded to nearest half hour (e.g., 10:30 AM, 3:00 PM)"
        }
        If a class occurs on multiple days, create a separate object for each day.
      `;

      // 2. Fire directly to Google, bypassing the SDK wrapper
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }]
        })
      });

      const data = await response.json();

      // Catch any real API errors directly
      if (!response.ok) {
        throw new Error(data.error?.message || "Google API Request Failed");
      }

      // 3. Parse the raw response
      const responseText = data.candidates[0].content.parts[0].text;
      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiBlocks = JSON.parse(cleanJsonStr);

      if (!aiBlocks || aiBlocks.length === 0) throw new Error("No classes detected.");

      const finalBlocks = aiBlocks.map(block => ({
        ...block,
        color: selectedColor 
      }));

      addSchedule(finalBlocks);

      if (navigation.isFocused()) {
        navigation.goBack();
      } else {
        Alert.alert("Import Complete \u2728", "Your routines have successfully been added to your SyncGrid.");
      }

    } catch (error) {
      console.error("AI Scan Error:", error);
      if (navigation.isFocused()) {
        Alert.alert("Scan Failed", `Error: ${error.message || "Could not read the schedule."}`);
      } else {
        Alert.alert("Import Failed", `The background scan failed: ${error.message}`);
      }
    } finally {
      setIsScanning(false);
    }
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

      {/* AI SCAN BUTTON */}
      <TouchableOpacity 
        style={[styles.aiBtn, { backgroundColor: '#673AB7' }]}
        onPress={scanScheduleWithAI}
        disabled={isScanning}
      >
        {isScanning ? (
          <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
        ) : (
          <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
        )}
        <Text style={styles.toggleText}>
          {isScanning ? 'Organizing your schedule...' : 'Auto-Import Routine'}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.label, { color: theme.text, marginTop: 5 }]}>Routine Color</Text>
      <View style={{ marginBottom: 15 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {ROUTINE_COLORS.map(color => (
            <TouchableOpacity
              key={color}
              onPress={() => setSelectedColor(color)}
              style={[styles.colorCircle, { backgroundColor: color }]}
            >
              {selectedColor === color && <Ionicons name="checkmark" size={20} color="#fff" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity 
        style={[styles.toggleBtn, activeMode === 'start' ? styles.toggleStart : styles.toggleEnd]}
        onPress={() => setActiveMode(activeMode === 'start' ? 'end' : 'start')}
        activeOpacity={0.8}
      >
        <Text style={styles.toggleText}>
          {activeMode === 'start' ? 'Starting' : 'Ending'} Time (tap to switch)
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
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 15, borderRadius: 8, backgroundColor: 'white', fontSize: 16 },
  colorCircle: { width: 40, height: 40, borderRadius: 20, marginRight: 12, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1 },
  aiBtn: { padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 15, elevation: 3, flexDirection: 'row', justifyContent: 'center' },
  toggleBtn: { padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 15, elevation: 3 },
  toggleStart: { backgroundColor: '#4CAF50' },
  toggleEnd: { backgroundColor: '#F44336' },
  toggleText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  gridContainer: { flex: 1, backgroundColor: 'white', borderRadius: 8, padding: 5, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  timeLabelEmpty: { width: 65 }, 
  dayHeader: { width: 45, textAlign: 'center', fontWeight: 'bold', color: '#555', fontSize: 12, marginHorizontal: 1 },
  timeLabel: { width: 65, fontSize: 11, color: '#555', textAlign: 'right', paddingRight: 5 },
  cell: { width: 45, height: 30, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fdfdfd', marginHorizontal: 1, borderRadius: 4 },
  cellStart: { backgroundColor: '#4CAF50', borderColor: '#388E3C' },
  cellEnd: { backgroundColor: '#F44336', borderColor: '#D32F2F' },
  buttonContainer: { marginTop: 15 }
});