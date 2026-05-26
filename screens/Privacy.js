import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { ThemeContext } from '../ThemeContext';

export default function Privacy() {
  const { theme } = useContext(ThemeContext);
  
  // Defaulting to true (public)
  const [publicBio, setPublicBio] = useState(true);
  const [publicGender, setPublicGender] = useState(true);
  const [publicNationality, setPublicNationality] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // If the field doesn't exist yet, we assume it's true (public)
        setPublicBio(data.publicBio !== false);
        setPublicGender(data.publicGender !== false);
        setPublicNationality(data.publicNationality !== false);
      }
    });
    return () => unsubscribe();
  }, []);

  const toggleSetting = async (field, currentValue) => {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        [field]: !currentValue
      });
    } catch (error) {
      console.error("Error updating privacy:", error);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.headerText, { color: theme.subText }]}>
        Control what other members can see when they click on your profile in a Circle.
      </Text>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Show Bio</Text>
            <Text style={[styles.desc, { color: theme.subText }]}>Allow others to read your biography.</Text>
          </View>
          <Switch value={publicBio} onValueChange={() => toggleSetting('publicBio', publicBio)} />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Show Gender</Text>
            <Text style={[styles.desc, { color: theme.subText }]}>Display your gender identity.</Text>
          </View>
          <Switch value={publicGender} onValueChange={() => toggleSetting('publicGender', publicGender)} />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Show Nationality</Text>
            <Text style={[styles.desc, { color: theme.subText }]}>Display your nationality.</Text>
          </View>
          <Switch value={publicNationality} onValueChange={() => toggleSetting('publicNationality', publicNationality)} />
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  headerText: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 10, padding: 15 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  desc: { fontSize: 12 },
  divider: { height: 1, my: 10 }
});