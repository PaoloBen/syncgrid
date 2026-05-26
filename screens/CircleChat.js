import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDoc, doc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebaseConfig';
import { ThemeContext } from '../ThemeContext';

export default function CircleChat({ route, navigation }) {
  const { activeGroupId, groupName } = route.params;
  const { theme, isDarkMode } = useContext(ThemeContext);
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef();

  // Set the header title dynamically
  useEffect(() => {
    navigation.setOptions({ 
      title: `${groupName} Chat`,
      headerStyle: { backgroundColor: theme.card },
      headerTintColor: theme.text
    });
  }, [groupName, theme]);

  // Real-time listener for messages in this specific Circle
  useEffect(() => {
    if (!activeGroupId) return;

    // We store messages in a subcollection: groups -> [groupId] -> messages
    const q = query(
      collection(db, 'groups', activeGroupId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [activeGroupId]);

  useEffect(() => {
    if (!activeGroupId || !auth.currentUser) return;
    // Mark as read when opening the chat
    updateDoc(doc(db, 'groups', activeGroupId), {
      [`lastRead.${auth.currentUser.uid}`]: Date.now()
    });
  }, [activeGroupId, messages.length]); // Re-trigger when new messages arrive while open

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      // 1. Bypass the Auth cache and pull the absolute truth from Firestore
      const userDocSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};

      // 2. Map the freshest data, with safe fallbacks
      const realName = userData.name || auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
      const realAvatar = userData.avatar || auth.currentUser.photoURL || `https://ui-avatars.com/api/?name=${realName.replace(' ', '+')}&background=007bff&color=fff`;

      await addDoc(collection(db, 'groups', activeGroupId, 'messages'), {
        text: inputText.trim(),
        createdAt: serverTimestamp(),
        userId: auth.currentUser.uid,
        userName: realName, 
        avatar: realAvatar,  
        userEmail: auth.currentUser.email
      });

      // NEW: Update the group's global last message timestamp
      const now = Date.now();
      await updateDoc(doc(db, 'groups', activeGroupId), {
        lastMessageAt: now,
        [`lastRead.${auth.currentUser.uid}`]: now
        });
      
      setInputText('');
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.userId === auth.currentUser?.uid;

    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
        {!isMe && <Image source={{ uri: item.avatar }} style={styles.avatar} />}
        <View style={[styles.messageBubble, isMe ? [styles.messageMe, { backgroundColor: '#007bff' }] : [styles.messageThem, { backgroundColor: theme.card }]]}>
          
          {!isMe && (
            <Text style={[styles.senderName, { color: theme.subText }]}>
              {item.userName || (item.userEmail ? item.userEmail.split('@')[0] : 'User')}
            </Text>
          )}
          
          <Text style={[styles.messageText, { color: isMe ? '#fff' : theme.text }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.bg }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.bg, color: theme.text }]}
          placeholder="Type a message..."
          placeholderTextColor={theme.subText}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatList: { padding: 15, paddingBottom: 20 },
  messageWrapper: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
  messageWrapperLeft: { justifyContent: 'flex-start' },
  messageWrapperRight: { justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10, backgroundColor: '#eee' }, 
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  messageMe: { borderBottomRightRadius: 4 },
  messageThem: { borderBottomLeftRadius: 4 },
  senderName: { fontSize: 11, marginBottom: 4, fontWeight: 'bold' },
  messageText: { fontSize: 16 },
  inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, alignItems: 'center' },
  input: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, fontSize: 16 },
  sendButton: { marginLeft: 10, padding: 10 }
});