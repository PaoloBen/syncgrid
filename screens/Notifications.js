import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';

import { SwipeListView } from 'react-native-swipe-list-view';

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  addDoc
} from 'firebase/firestore';

import { auth, db } from '../firebaseConfig';
import { ThemeContext } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function Notifications({ navigation }) {
  const { theme } = useContext(ThemeContext);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      setNotifications(notifs);

      // Auto mark as read
      notifs.forEach(n => {
        if (!n.read) {
          updateDoc(
            doc(
              db,
              'users',
              auth.currentUser.uid,
              'notifications',
              n.id
            ),
            { read: true }
          );
        }
      });
    });

    return () => unsubscribe();
  }, []);

  // DELETE NOTIFICATION
  const deleteNotification = async (notifId) => {
    try {
      await deleteDoc(
        doc(
          db,
          'users',
          auth.currentUser.uid,
          'notifications',
          notifId
        )
      );
    } catch (e) {
      console.error("Delete notification error:", e);
    }
  };

  // APPROVE REQUEST
  const approveJoinRequest = async (notif) => {
    try {
      await updateDoc(doc(db, 'groups', notif.groupId), {
        joinRequests: arrayRemove(notif.requesterUid),
        members: arrayUnion(notif.requesterUid),
        memberCount: increment(1)
      });

      // Notify requester
      await addDoc(
        collection(
          db,
          'users',
          notif.requesterUid,
          'notifications'
        ),
        {
          title: 'Join Request Accepted',
          body: 'Your request was accepted.',
          createdAt: Date.now(),
          read: false
        }
      );

      // Delete original request notif
      await deleteNotification(notif.id);

    } catch (e) {
      console.error("Approve request error:", e);
      Alert.alert("Error", "Failed to approve request.");
    }
  };

  // REJECT REQUEST
  const rejectJoinRequest = async (notif) => {
    try {
      await updateDoc(doc(db, 'groups', notif.groupId), {
        joinRequests: arrayRemove(notif.requesterUid)
      });

      // Notify requester
      await addDoc(
        collection(
          db,
          'users',
          notif.requesterUid,
          'notifications'
        ),
        {
          title: 'Join Request Rejected',
          body: 'Your request was rejected.',
          createdAt: Date.now(),
          read: false
        }
      );

      // Delete original request notif
      await deleteNotification(notif.id);

    } catch (e) {
      console.error("Reject request error:", e);
      Alert.alert("Error", "Failed to reject request.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {notifications.length === 0 ? (
        <Text
          style={{
            color: theme.subText,
            textAlign: 'center',
            marginTop: 50
          }}
        >
          No new notifications.
        </Text>
      ) : (
        <SwipeListView
          data={notifications}
          keyExtractor={item => item.id}
          rightOpenValue={-80}
          disableRightSwipe

          renderItem={({ item }) => (
            <View
              style={[
                styles.notificationCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border
                }
              ]}
            >
              <Ionicons
                name="notifications"
                size={24}
                color={item.read ? theme.subText : "#007bff"}
                style={{ marginRight: 15 }}
              />

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.text,
                      fontWeight: item.read ? 'normal' : 'bold'
                    }
                  ]}
                >
                  {item.title}
                </Text>

                <Text
                  style={{
                    color: theme.subText,
                    fontSize: 13
                  }}
                >
                  {item.body}
                </Text>

                {/* JOIN REQUEST ACTIONS */}
                {item.type === 'join_request' && (
                  <View
                    style={{
                      flexDirection: 'row',
                      marginTop: 12
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => approveJoinRequest(item)}
                      style={{
                        backgroundColor: '#00C853',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        marginRight: 10
                      }}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      >
                        Accept
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => rejectJoinRequest(item)}
                      style={{
                        backgroundColor: '#D50000',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8
                      }}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      >
                        Reject
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {!item.read && (
                <View style={styles.unreadDot} />
              )}
            </View>
          )}

          renderHiddenItem={({ item }) => (
            <View style={styles.hiddenRow}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteNotification(item.id)}
              >
                <Ionicons
                  name="trash"
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15
  },

  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1
  },

  title: {
    fontSize: 16,
    marginBottom: 4
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginLeft: 10,
    marginTop: 5
  },

  hiddenRow: {
    alignItems: 'flex-end',
    backgroundColor: '#D50000',
    borderRadius: 10,
    marginBottom: 10,
    height: '88%',
    justifyContent: 'center',
    paddingRight: 25
  },

  deleteButton: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80
  }
});