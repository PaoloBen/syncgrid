import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { ThemeContext } from '../ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from 'firebase/auth';

export default function EditProfile({ navigation }) {
  const { theme } = useContext(ThemeContext);
  
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [avatar, setAvatar] = useState(''); 
  const [isUploading, setIsUploading] = useState(false);

  // Fetch existing data when screen loads
  useEffect(() => {
    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setName(data.name || '');
        setBio(data.bio || '');
        setGender(data.gender || '');
        setNationality(data.nationality || '');
        setAvatar(data.avatar || '');
      }
    };
    fetchUserData();
  }, []);

  const pickAndUploadAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      uploadToImgBB(result.assets[0].base64);
    }
  };

  const uploadToImgBB = async (base64String) => {
    setIsUploading(true);
    try {
      const apiKey = 'be6472112dc77de47b8acd1f875236ca';
      
      const formData = new FormData();
      formData.append('image', base64String);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const imageUrl = data.data.url;
        setAvatar(imageUrl); // Update UI immediately

        // Save URL straight to Firestore
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          avatar: imageUrl
        }, { merge: true });

        Alert.alert("Success!", "Your profile picture has been updated.");
      } else {
        throw new Error("ImgBB upload failed");
      }
    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert("L", "Could not upload image. Check your connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const finalAvatar = avatar || `https://ui-avatars.com/api/?name=${name ? name.replace(' ', '+') : 'User'}&background=random&color=fff`;

      // 1. Updates your Database
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        name, bio, gender, nationality, avatar: finalAvatar
      }, { merge: true });
      
      // 2. NEW: Syncs your Core Auth Profile so CircleChat sees it!
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: finalAvatar
      });
      
      Alert.alert("Success", "Profile updated!");
      navigation.goBack();
    } catch (error) {
      console.error("Error saving profile: ", error);
      Alert.alert("Error", "Could not save profile.");
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        
        {/* AVATAR UPLOAD SECTION */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickAndUploadAvatar} disabled={isUploading}>
            {isUploading ? (
              <View style={[styles.profileImage, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#007bff" />
              </View>
            ) : (
              <Image 
                source={{ uri: avatar || 'https://ui-avatars.com/api/?name=User' }} 
                style={styles.profileImage} 
              />
            )}
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: theme.subText }]}>Tap to change</Text>
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Display Name</Text>
        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={name} onChangeText={setName} placeholder="e.g. John Doe" placeholderTextColor={theme.subText} />

        <Text style={[styles.label, { color: theme.text }]}>Bio</Text>
        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={bio} onChangeText={setBio} placeholder="Student at..." placeholderTextColor={theme.subText} multiline />

        <Text style={[styles.label, { color: theme.text }]}>Gender</Text>
        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={gender} onChangeText={setGender} placeholder="e.g. Male, Female, Non-binary" placeholderTextColor={theme.subText} />

        <Text style={[styles.label, { color: theme.text }]}>Nationality</Text>
        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={nationality} onChangeText={setNationality} placeholder="e.g. Filipino" placeholderTextColor={theme.subText} />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  card: { padding: 20, borderRadius: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  avatarContainer: { alignItems: 'center', marginBottom: 20 },
  profileImage: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee' },
  avatarHint: { fontSize: 12, marginTop: 8 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 5, marginTop: 15 },
  input: { borderWidth: 1, padding: 12, borderRadius: 8, fontSize: 16 },
  saveButton: { backgroundColor: '#007bff', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 25 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});